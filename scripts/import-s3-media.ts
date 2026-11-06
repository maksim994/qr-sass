import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { mediaConfig } from "@/lib/media-config";
import { LocalMediaStorage, assertMediaKey, MEDIA_MAX_BYTES } from "@/lib/media-storage";
import { localPublicMediaUrl } from "@/lib/public-media-url";

/** Optional recovery path if the old S3 returns. --local-only uses an already restored key tree. */
async function main() {
  const { values } = parseArgs({ options: { apply: { type: "boolean" }, report: { type: "string" }, "local-only": { type: "boolean" } } });
  if (values.apply && !values.report) throw new Error("--apply requires --report /absolute/report.json");
  const endpoint = process.env.S3_ENDPOINT, bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID, secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBase = process.env.S3_PUBLIC_URL || endpoint || "https://s3.mvmolkov.ru";
  const publicPrefix = `${publicBase.replace(/\/$/, "")}/${process.env.S3_PUBLIC_OMIT_BUCKET !== "true" && bucket ? `${bucket}/` : ""}`;
  const local = new LocalMediaStorage(mediaConfig().MEDIA_ROOT);
  const keys: string[] = [];
  let client: S3Client | undefined;
  if (!values["local-only"]) {
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("Configure source S3_* variables or use --local-only");
    client = new S3Client({ endpoint, region: process.env.S3_REGION || "ru1", credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
    let cursor: string | undefined;
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${process.env.S3_PREFIX || "qr"}/`, ContinuationToken: cursor }), { abortSignal: AbortSignal.timeout(30000) });
      for (const object of page.Contents ?? []) {
        if (!object.Key || object.Key.endsWith("/")) continue;
        assertMediaKey(object.Key);
        if ((object.Size ?? 0) > MEDIA_MAX_BYTES) throw new Error("Source object exceeds the supported media size");
        keys.push(object.Key);
      }
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !cursor) throw new Error("Source listing was truncated without a continuation token");
    } while (cursor);
  }
  const db = getDb();
  try {
    const users = await db.user.findMany({ where: { avatarUrl: { not: null } }, select: { id: true, avatarUrl: true } });
    const settings = await db.siteSettings.findMany({ where: { faviconUrl: { not: null } }, select: { id: true, faviconUrl: true } });
    const available = new Set(keys), missing: { id: string; key: string }[] = [];
    const replacements: { kind: "avatar" | "favicon"; id: string; before: string; after: string }[] = [];
    for (const row of [...users.map(user => ({ kind: "avatar" as const, id: user.id, url: user.avatarUrl! })), ...settings.map(site => ({ kind: "favicon" as const, id: site.id, url: site.faviconUrl! }))]) {
      const base = [publicPrefix, "https://s3.mvmolkov.ru/"].find(prefix => row.url.startsWith(prefix));
      if (!base) continue;
      const key = row.url.slice(base.length), after = localPublicMediaUrl(key);
      if (!after) continue;
      if (!available.has(key) && !await local.get(key, true)) { missing.push({ id: row.id, key }); continue; }
      replacements.push({ kind: row.kind, id: row.id, before: row.url, after });
    }
    const files = await db.uploadedFile.findMany({ select: { id: true, key: true } });
    for (const file of files) if (!available.has(file.key) && !await local.get(file.key, true)) missing.push(file);
    const report = { mode: values.apply ? "apply" : "dry-run", keys, replacements, missing };
    if (values.report) await writeFile(resolve(values.report), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ mode: report.mode, sourceObjects: keys.length, publicUrls: replacements.length, missing }));
    if (!values.apply) return;
    if (missing.length) throw new Error("Known user media is missing; recover listed keys before switching storage");
    for (const key of keys) {
      if (await local.get(key, true)) continue; // Never overwrite a newer local upload.
      const object = await client!.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(30000) });
      if ((object.ContentLength ?? 0) > MEDIA_MAX_BYTES) throw new Error("Oversized source object");
      const body = await object.Body?.transformToByteArray();
      if (!body) throw new Error("Empty source response");
      await local.put(key, Buffer.from(body), object.ContentType ?? "application/octet-stream", "private");
    }
    await db.$transaction(async tx => {
      for (const row of replacements) {
        if (row.kind === "avatar") await tx.user.update({ where: { id: row.id, avatarUrl: row.before }, data: { avatarUrl: row.after } });
        else await tx.siteSettings.update({ where: { id: row.id, faviconUrl: row.before }, data: { faviconUrl: row.after } });
      }
    });
    console.log("Imported. UploadedFile keys and all QR records are unchanged.");
  } finally { await db.$disconnect(); client?.destroy(); }
}
main().catch(() => { console.error("Media import failed; inspect the private report/source configuration"); process.exitCode = 1; });
