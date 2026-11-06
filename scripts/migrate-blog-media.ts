import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { lstat, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { mediaConfig } from "@/lib/media-config";
import { LocalMediaStorage } from "@/lib/media-storage";
import { blogMediaKeyFromUrl, blogMediaUrlForKey } from "@/lib/blog-media-url";
import { legacyMediaSource, recoveredMediaFilename, migrateArticleMedia } from "@/lib/blog-media-migration";
import { recordSave } from "@/lib/blog-versions";

const fields = ["content", "renderedHtml", "legacyHtml", "coverImageUrl", "structuredData"] as const;
const actor = { actorId: null, actorName: "Миграция локальных медиа", source: "system" as const };

async function main() {
  const { values } = parseArgs({ options: { copies: { type: "string" }, report: { type: "string" }, apply: { type: "boolean" }, "dry-run": { type: "boolean" } } });
  if (!values.copies || (values.apply && values["dry-run"]) || (values.apply && !values.report))
    throw new Error("Usage: --copies /absolute/path [--dry-run | --apply --report /absolute/report.json]");
  const copiesRoot = resolve(values.copies);
  if (!(await lstat(copiesRoot)).isDirectory() || !(await readdir(copiesRoot)).some(name => /^[a-f0-9]{10}\.webp$/.test(name)))
    throw new Error("Copies directory must contain recovered WebP files (10 lowercase MD5 characters)");
  const source = new LocalMediaStorage(copiesRoot), destination = new LocalMediaStorage(mediaConfig().MEDIA_ROOT);
  const db = getDb();
  try {
    const posts = await db.blogPost.findMany({ include: { pendingRevision: true }, orderBy: { id: "asc" } });
    const images = await db.blogImage.findMany();
    const discovered = new Set<string>();
    const discover = (url: string) => { if (legacyMediaSource(url)) discovered.add(url); return url; };
    for (const post of posts) {
      migrateArticleMedia(post, discover);
      if (post.pendingRevision) for (const value of [post.pendingRevision.input, post.pendingRevision.snapshot]) migrateArticleMedia(value as Record<string, never>, discover);
    }
    for (const image of images) {
      discover(image.url);
      for (const variant of image.variants as { url: string }[]) discover(variant.url);
    }
    const replacements = new Map<string, string | null>();
    const files = new Map<string, { filename: string; checksum: string }>();
    const filenames = new Map<string, string>();
    for (const url of discovered) {
      // New local uploads and completed migrations survive repeat runs unchanged.
      const localKey = blogMediaKeyFromUrl(url);
      if (localKey && await destination.get(localKey, true)) { replacements.set(url, blogMediaUrlForKey(localKey)); continue; }
      const old = legacyMediaSource(url)!, filename = recoveredMediaFilename(old);
      if (filenames.has(filename) && filenames.get(filename) !== old) throw new Error("Truncated MD5 collision; resolve before migration");
      filenames.set(filename, old);
      const object = await source.get(filename);
      if (!object?.body) { replacements.set(url, null); continue; }
      const metadata = await sharp(object.body).metadata();
      if (metadata.format !== "webp") throw new Error(`Invalid recovered WebP: ${filename}`);
      const key = `qr/blog/content/${filename}`;
      const existing = await destination.get(key);
      if (existing?.body && !existing.body.equals(object.body)) throw new Error(`Destination differs: ${filename}`);
      files.set(key, { filename, checksum: createHash("sha256").update(object.body).digest("hex") });
      replacements.set(url, blogMediaUrlForKey(key));
    }
    const patchUrl = (url: string) => replacements.has(url) ? replacements.get(url)! : url;
    const changes = posts.map(before => {
      const missing = new Set<string>();
      const replace = (url: string) => { const next = patchUrl(url); if (next === null) missing.add(url); return next; };
      const after = migrateArticleMedia(before, replace);
      const data = Object.fromEntries(fields.filter(key => after[key] !== before[key]).map(key => [key, after[key]]));
      const pending = before.pendingRevision;
      const pendingAfter = pending ? {
        input: migrateArticleMedia(pending.input as Record<string, never>, replace),
        snapshot: migrateArticleMedia(pending.snapshot as Record<string, never>, replace),
      } : null;
      const pendingChanged = pendingAfter && (JSON.stringify(pendingAfter.input) !== JSON.stringify(pending!.input) || JSON.stringify(pendingAfter.snapshot) !== JSON.stringify(pending!.snapshot));
      return { before, data, pendingAfter, pendingChanged, missing: [...missing] };
    }).filter(change => Object.keys(change.data).length || change.pendingChanged);
    const imageChanges = images.flatMap(before => {
      const variants = (before.variants as { url: string; key: string; width: number; height: number }[]).flatMap(variant => {
        const url = patchUrl(variant.url);
        return url ? [{ ...variant, url, key: blogMediaKeyFromUrl(url) ?? variant.key }] : [];
      });
      const url = patchUrl(before.url) ?? variants.at(-1)?.url ?? null;
      if (url === before.url && JSON.stringify(variants) === JSON.stringify(before.variants)) return [];
      return [{ before, url, variants }];
    });
    const report = { mode: values.apply ? "apply" : "dry-run", createdAt: new Date().toISOString(), files: [...files].map(([key, file]) => ({ key, filename: file.filename })),
      missingArticles: changes.filter(row => row.missing.length).map(row => ({ id: row.before.id, slug: row.before.slug, title: row.before.title, urls: row.missing })),
      // Original records make the exact migration reversible. Keep the report private.
      posts: changes.map(row => ({ before: row.before, data: row.data, pendingAfter: row.pendingAfter })), images: imageChanges };
    if (values.report) await writeFile(resolve(values.report), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    for (const row of report.missingArticles) console.log(`MISSING ${row.slug} — ${row.title}\n${row.urls.join("\n")}`);
    console.log(JSON.stringify({ mode: report.mode, articles: changes.length, images: imageChanges.length, files: files.size, missingArticles: report.missingArticles.length }));
    if (!values.apply) return;
    // Copy first. An interrupted copy never leaves DB links pointing to absent files.
    for (const [key, file] of files) {
      const object = await source.get(file.filename);
      if (!object?.body || createHash("sha256").update(object.body).digest("hex") !== file.checksum) throw new Error("Source copy changed during migration");
      await destination.put(key, object.body, "image/webp", "public");
    }
    await db.$transaction(async tx => {
      for (const { before, data, pendingAfter } of changes) {
        const updatedAt = new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1));
        const post = await tx.blogPost.update({ where: { id: before.id, updatedAt: before.updatedAt }, data: { ...data, contentUpdatedAt: before.contentUpdatedAt ?? before.updatedAt, updatedAt } });
        await recordSave(tx, before, post, actor, "Восстановление медиа на локальном диске");
        if (before.pendingRevision && pendingAfter) {
          const pending = before.pendingRevision;
          await tx.blogPendingRevision.update({ where: { id: pending.id, updatedAt: pending.updatedAt }, data: {
            input: pendingAfter.input as Prisma.InputJsonObject, snapshot: pendingAfter.snapshot as Prisma.InputJsonObject,
            // Preserve an already-stale pending revision; never silently approve it.
            baseUpdatedAt: pending.baseUpdatedAt.getTime() === before.updatedAt.getTime() ? updatedAt : pending.baseUpdatedAt,
          } });
        } else if (await tx.blogPendingRevision.count({ where: { postId: before.id } })) throw new Error("Pending revision appeared during migration; retry");
      }
      for (const change of imageChanges) {
        const where = { id: change.before.id, url: change.before.url, variants: { equals: change.before.variants as Prisma.InputJsonValue } };
        if (change.url) await tx.blogImage.update({ where, data: { url: change.url, variants: change.variants } });
        else await tx.blogImage.delete({ where });
      }
    }, { timeout: 120000 });
    console.log("Applied. Original records are saved in the report; no S3 objects were changed.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Media migration failed"); process.exitCode = 1; });
