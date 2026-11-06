import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, symlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalMediaStorage, MEDIA_MAX_BYTES } from "./media-storage.ts";
import { backupMedia, type MediaBackupTarget } from "./media-backup.ts";
import { mediaBackupConfig } from "./media-config.ts";
import { publicAssetKey } from "./public-media-url.ts";
import { createBlogMediaHandler } from "./blog-media-http.ts";
import { recoveredMediaFilename } from "./blog-media-migration.ts";

test("local media supports atomic write, HEAD, read, delete and rejects traversal/symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "qr-local-media-")), storage = new LocalMediaStorage(root);
  try {
    const key = "qr/workspace/private.pdf", body = Buffer.from("private bytes");
    await storage.put(key, body, "application/pdf", "private");
    const head = await storage.get(key, true);
    assert.equal(head?.length, body.length); assert.equal(head?.body, undefined);
    assert.equal(head?.contentType, "application/pdf"); assert.ok(head?.etag);
    assert.deepEqual((await storage.get(key))?.body, body);
    await storage.delete(key); assert.equal(await storage.get(key), null);
    for (const invalid of ["../secret", "/etc/passwd", "a/../../secret", "a/%2e%2e/secret", "a/./secret", "a\\secret", "a/\0secret", "a//b", ".secret"]) await assert.rejects(storage.get(invalid));
    await symlink(tmpdir(), join(root, "linked"));
    await assert.rejects(storage.get("linked/file.webp"));
    await assert.rejects(storage.put("linked/file.webp", body, "image/webp", "public"));
    await symlink("/etc/passwd", join(root, "qr", "secret.webp"));
    await assert.rejects(storage.get("qr/secret.webp"));
    await assert.rejects(storage.put("qr/too-large.webp", Buffer.alloc(MEDIA_MAX_BYTES + 1), "image/webp", "public"));
    await storage.delete("absent/directory/file.webp");
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("public assets only expose avatars/favicon; private and active-content paths stay inaccessible", async () => {
  assert.equal(publicAssetKey(["avatars", "user", "image.webp"]), "qr/avatars/user/image.webp");
  assert.equal(publicAssetKey(["site", "favicon_abc.ico"]), "qr/site/favicon_abc.ico");
  let reads = 0;
  const media = createBlogMediaHandler(async () => { reads++; return null; }, 1024, 10, publicAssetKey);
  for (const parts of [["workspace", "secret.pdf"], ["avatars", "..", "x.webp"], ["avatars", "user", "x.svg"], ["site", "secret.png"], ["site", "favicon_a.png", "extra"]]) {
    assert.equal((await media.handle(new Request("https://qr-s.ru/media/assets/test"), parts)).status, 404);
  }
  assert.equal(reads, 0);
});
test("backup copies every namespace, skips unchanged bytes, updates changes and retains deleted files", async () => {
  const root = await mkdtemp(join(tmpdir(), "qr-media-backup-")), storage = new LocalMediaStorage(root);
  const remote = new Map<string, { checksum: string; body: Buffer; mime: string }>();
  const target: MediaBackupTarget = { async checksum(key) { return remote.get(key)?.checksum; }, async put(key, body, mime, checksum) { remote.set(key, { checksum, body, mime }); } };
  try {
    await storage.put("qr/blog/content/a.webp", Buffer.from("image"), "image/webp", "public");
    await storage.put("qr/workspace/private.pdf", Buffer.from("document"), "application/pdf", "private");
    await writeFile(join(root, ".migration-originals.json"), "sensitive report");
    assert.deepEqual(await backupMedia(root, target), { uploaded: 2, unchanged: 0 });
    assert.equal(remote.get("qr/workspace/private.pdf")?.mime, "application/pdf");
    assert.deepEqual(await backupMedia(root, target), { uploaded: 0, unchanged: 2 });
    await storage.put("qr/blog/content/a.webp", Buffer.from("new image"), "image/webp", "public");
    await storage.delete("qr/workspace/private.pdf");
    assert.deepEqual(await backupMedia(root, target), { uploaded: 1, unchanged: 0 });
    assert.ok(remote.has("qr/workspace/private.pdf")); assert.equal(remote.size, 2);
    await assert.rejects(backupMedia(root, { ...target, async checksum() { throw new Error("provider unavailable"); } }));
    await mkdir(join(root, "unsafe")); await symlink(tmpdir(), join(root, "unsafe", "link"));
    await assert.rejects(backupMedia(root, target));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("backup credentials are independent, optional as a set, and reject Beget/the primary endpoint", () => {
  assert.equal(mediaBackupConfig({}), null);
  const config = { MEDIA_BACKUP_S3_ENDPOINT: "https://storage.other-provider.example", MEDIA_BACKUP_S3_BUCKET: "private-copy", MEDIA_BACKUP_S3_ACCESS_KEY: "test", MEDIA_BACKUP_S3_SECRET_KEY: "test" };
  assert.equal(mediaBackupConfig(config)?.bucket, "private-copy");
  for (const endpoint of ["http://storage.other-provider.example", "https://s3.mvmolkov.ru", "https://s3.ru1.storage.beget.cloud", "https://beget.com", "https://user:pass@storage.other-provider.example"]) assert.throws(() => mediaBackupConfig({ ...config, MEDIA_BACKUP_S3_ENDPOINT: endpoint }));
  assert.throws(() => mediaBackupConfig({ ...config, S3_ENDPOINT: config.MEDIA_BACKUP_S3_ENDPOINT }));
  assert.throws(() => mediaBackupConfig({ MEDIA_BACKUP_S3_ENDPOINT: config.MEDIA_BACKUP_S3_ENDPOINT }));
});
test("the upload facade and legacy blog URLs work locally without any S3 credentials", async () => {
  const root = await mkdtemp(join(tmpdir(), "qr-media-facade-"));
  const before = { MEDIA_STORAGE: process.env.MEDIA_STORAGE, MEDIA_ROOT: process.env.MEDIA_ROOT };
  process.env.MEDIA_STORAGE = "local"; process.env.MEDIA_ROOT = root;
  try {
    const { uploadFile, getFileObject, getBlogMediaObject, deleteFile } = await import("./s3.ts");
    const bytes = Buffer.from("image");
    assert.equal(await uploadFile(bytes, "qr/avatars/user/a.webp", "image/webp", "public"), "https://qr-s.ru/media/assets/avatars/user/a.webp");
    assert.deepEqual((await getFileObject("qr/avatars/user/a.webp"))?.body, bytes);
    assert.equal(await uploadFile(bytes, "qr/workspace/a.pdf", "application/pdf"), "");
    await assert.rejects(uploadFile(bytes, "qr/workspace/public.webp", "image/webp", "public"));
    const old = "https://s3.mvmolkov.ru/qr/blog/content/original.webp";
    await uploadFile(bytes, `qr/blog/content/${recoveredMediaFilename(old)}`, "image/webp", "public");
    assert.deepEqual((await getBlogMediaObject("qr/blog/content/original.webp"))?.body, bytes);
    assert.equal(await getBlogMediaObject("qr/workspace/a.pdf"), null);
    await deleteFile("qr/avatars/user/a.webp"); assert.equal(await getFileObject("qr/avatars/user/a.webp"), null);
  } finally {
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await rm(root, { recursive: true, force: true });
  }
});
