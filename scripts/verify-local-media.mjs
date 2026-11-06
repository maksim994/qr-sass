import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { recoveredMediaFilename } from "@/lib/blog-media-migration";
import { LocalMediaStorage } from "@/lib/media-storage";

const connection = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
if (process.env.MEDIA_MIGRATION_ISOLATED_TEST !== "1" || !["localhost", "127.0.0.1", "postgres"].includes(connection.hostname) || connection.pathname !== "/qr_media_test")
  throw new Error("Use only an explicitly isolated local qr_media_test database");
const db = getDb();
const root = await mkdtemp(join(tmpdir(), "qr-media-integration-"));
const copies = join(root, "copies"), destination = join(root, "media");
const old = "https://s3.mvmolkov.ru/qr/blog/content/fixture.webp", missing = "https://s3.mvmolkov.ru/qr/blog/covers/lost.webp";
const now = new Date("2026-01-02T03:04:05Z");
const prefix = "local-media-fixture";
function run(script, args, expected = 0) {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--import", "./scripts/register-src-alias.mjs", `scripts/${script}`, ...args], {
    env: { ...process.env, APP_URL: "https://qr-s.ru", MEDIA_STORAGE: "local", MEDIA_ROOT: destination, S3_ENDPOINT: "", S3_BUCKET: "", S3_ACCESS_KEY_ID: "", S3_SECRET_ACCESS_KEY: "" }, encoding: "utf8",
  });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return result.stdout;
}
let seeded = false;
try {
  assert.equal(await db.user.count(), 0, "Fixture DB must be empty");
  assert.equal(await db.blogPost.count(), 0, "Fixture DB must be empty");
  seeded = true;
  await mkdir(copies);
  const bytes = await sharp({ create: { width: 48, height: 24, channels: 3, background: "red" } }).webp().toBuffer();
  await writeFile(join(copies, recoveredMediaFilename(old)), bytes);
  await db.user.create({ data: { id: prefix, email: "media-fixture@example.invalid", passwordHash: "fixture", avatarUrl: `https://s3.mvmolkov.ru/qr/avatars/${prefix}/avatar.webp` } });
  await db.workspace.create({ data: { id: prefix, name: prefix, slug: prefix } });
  await db.uploadedFile.create({ data: { id: prefix, workspaceId: prefix, key: `qr/${prefix}/file.pdf`, filename: "file.pdf", mimeType: "application/pdf", sizeBytes: 3, url: `/api/upload/${prefix}/file` } });
  await db.qrCode.create({ data: { id: prefix, workspaceId: prefix, createdById: prefix, kind: "DYNAMIC", contentType: "PDF", name: prefix, shortCode: "fixtureMedia", encodedContent: "https://qr-s.ru/p/fixtureMedia", payload: { fileId: prefix } } });
  const qrBefore = await db.qrCode.findUniqueOrThrow({ where: { id: prefix } });
  const fileBefore = await db.uploadedFile.findUniqueOrThrow({ where: { id: prefix } });
  for (const format of ["html", "markdown"]) {
    const post = await db.blogPost.create({ data: { id: `${prefix}-${format}`, slug: `${prefix}-${format}`, title: `Статья ${format}`, format,
      content: format === "html" ? `<h2 id="keep">Keep</h2><img src="${old}"><figure><img src="${missing}"><figcaption>Lost</figcaption></figure>` : `## Keep\n\n![alt](${old})\n\n![lost][lost]\n\n[lost]: ${missing}`,
      coverImageUrl: missing, legacyHtml: `<img src="${old}">`, structuredData: JSON.stringify({ image: [old, missing] }), publishedAt: now, firstPublishedAt: now, updatedAt: now,
    } });
    await db.blogPendingRevision.create({ data: { postId: post.id, actorName: "fixture", baseUpdatedAt: now, input: { coverImageUrl: missing }, snapshot: { content: `<img src="${old}"><img src="${missing}">`, format: "html" } } });
  }
  await db.blogImage.create({ data: { id: prefix, url: old, kind: "content", alt: "Fixture", width: 48, height: 24, variants: [{ url: old, key: "qr/blog/content/fixture.webp", width: 48, height: 24 }], actorName: "fixture" } });
  await db.siteSettings.create({ data: { id: prefix, faviconUrl: "https://s3.mvmolkov.ru/qr/site/favicon_fixture.webp" } });

  const before = await db.blogPost.findMany({ orderBy: { id: "asc" } });
  const dryReport = join(root, "dry.json");
  const dry = run("migrate-blog-media.ts", ["--copies", copies, "--report", dryReport]);
  assert.ok(dry.includes('"mode":"dry-run"'));
  assert.deepEqual(await db.blogPost.findMany({ orderBy: { id: "asc" } }), before);
  const plan = JSON.parse(await readFile(dryReport, "utf8"));
  assert.equal(plan.missingArticles.length, 2); assert.equal(plan.files.length, 1);

  run("migrate-blog-media.ts", ["--copies", copies, "--apply", "--report", join(root, "apply.json")]);
  const newUrl = `https://qr-s.ru/media/blog/content/${recoveredMediaFilename(old)}`;
  const migrated = await db.blogPost.findMany({ include: { pendingRevision: true } });
  for (const post of migrated) {
    assert.equal(post.coverImageUrl, null); assert.ok(post.content.includes(newUrl));
    assert.ok(!post.content.includes(`<img src="${missing}"`)); assert.ok(!post.content.includes("![lost]"));
    assert.equal(post.contentUpdatedAt.toISOString(), now.toISOString());
    assert.equal(post.publishedAt.toISOString(), now.toISOString()); assert.equal(post.firstPublishedAt.toISOString(), now.toISOString());
    assert.equal(post.pendingRevision.input.coverImageUrl, null);
    assert.equal(post.pendingRevision.baseUpdatedAt.toISOString(), post.updatedAt.toISOString());
    assert.ok(post.pendingRevision.snapshot.content.includes(newUrl));
    assert.deepEqual(JSON.parse(post.structuredData).image, [newUrl]);
  }
  assert.deepEqual(await readFile(join(destination, "qr/blog/content", recoveredMediaFilename(old))), bytes);
  assert.equal((await db.blogImage.findUniqueOrThrow({ where: { id: prefix } })).url, newUrl);
  assert.equal(await db.blogRevision.count(), 4);
  const repeated = run("migrate-blog-media.ts", ["--copies", copies, "--apply", "--report", join(root, "repeat.json")]);
  assert.ok(repeated.includes('"articles":0'), repeated); assert.equal(await db.blogRevision.count(), 4);
  // Refuse reuse of an originals report; do not truncate it.
  run("migrate-blog-media.ts", ["--copies", copies, "--apply", "--report", dryReport], 1);
  assert.deepEqual(JSON.parse(await readFile(dryReport, "utf8")), plan);

  // local-only recovery requires every known private asset before rewriting public URLs.
  run("import-s3-media.ts", ["--local-only", "--apply", "--report", join(root, "missing-private.json")], 1);
  const local = new LocalMediaStorage(destination);
  await local.put(`qr/${prefix}/file.pdf`, Buffer.from("pdf"), "application/pdf", "private");
  await local.put(`qr/avatars/${prefix}/avatar.webp`, bytes, "image/webp", "public");
  await local.put("qr/site/favicon_fixture.webp", bytes, "image/webp", "public");
  run("import-s3-media.ts", ["--local-only", "--apply", "--report", join(root, "localize.json")]);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: prefix } })).avatarUrl, `https://qr-s.ru/media/assets/avatars/${prefix}/avatar.webp`);
  assert.equal((await db.siteSettings.findUniqueOrThrow({ where: { id: prefix } })).faviconUrl, "https://qr-s.ru/media/assets/site/favicon_fixture.webp");
  assert.deepEqual(await db.qrCode.findUniqueOrThrow({ where: { id: prefix } }), qrBefore);
  assert.deepEqual(await db.uploadedFile.findUniqueOrThrow({ where: { id: prefix } }), fileBefore);
  console.log("PASS: dry-run, restore/removal/report, pending edits, dates, history, repeat run, user media and QR compatibility");
} finally {
  if (seeded) {
    await db.blogPendingRevision.deleteMany({ where: { postId: { startsWith: prefix } } });
    await db.blogPost.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.blogRevision.deleteMany({ where: { postId: { startsWith: prefix } } });
    await db.blogEvent.deleteMany({ where: { postId: { startsWith: prefix } } });
    await db.blogImage.deleteMany({ where: { id: prefix } });
    await db.qrCode.deleteMany({ where: { id: prefix } });
    await db.workspace.deleteMany({ where: { id: prefix } });
    await db.user.deleteMany({ where: { id: prefix } });
    await db.siteSettings.deleteMany({ where: { id: prefix } });
  }
  await db.$disconnect(); await rm(root, { recursive: true, force: true });
}
