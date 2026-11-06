import assert from "node:assert/strict";
import { createServer } from "node:https";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile), root = await mkdtemp(join(tmpdir(), "qr-backup-http-"));
const remote = new Map();
let server;
try {
  const key = join(root, "tls.key"), cert = join(root, "tls.crt"), media = join(root, "media");
  await exec("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1", "-keyout", key, "-out", cert]);
  server = createServer({ key: await readFile(key), cert: await readFile(cert) }, async (request, response) => {
    const path = new URL(request.url, "https://localhost").pathname;
    if (request.method === "HEAD") {
      const object = remote.get(path);
      if (!object) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { "x-amz-meta-sha256": object.checksum, "Content-Length": object.body.length }); response.end(); return;
    }
    if (request.method === "PUT") {
      assert.equal(request.headers["x-amz-acl"], undefined, "Backup objects must remain private");
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      remote.set(path, { body: Buffer.concat(chunks), checksum: request.headers["x-amz-meta-sha256"], mime: request.headers["content-type"] });
      response.writeHead(200); response.end(); return;
    }
    response.writeHead(405); response.end();
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  await mkdir(join(media, "qr/blog/content"), { recursive: true });
  await mkdir(join(media, "qr/workspace"), { recursive: true });
  await writeFile(join(media, "qr/blog/content/a.webp"), "image");
  await writeFile(join(media, "qr/workspace/a.pdf"), "private document");
  const run = async () => (await exec(process.execPath, ["--experimental-strip-types", "--import", "./scripts/register-src-alias.mjs", "scripts/media-backup.ts"], { env: {
    ...process.env, MEDIA_ROOT: media, S3_ENDPOINT: "", NODE_EXTRA_CA_CERTS: cert,
    MEDIA_BACKUP_S3_ENDPOINT: `https://127.0.0.1:${server.address().port}`, MEDIA_BACKUP_S3_BUCKET: "fixture-backup", MEDIA_BACKUP_S3_REGION: "us-east-1",
    MEDIA_BACKUP_S3_ACCESS_KEY: "fixture-access", MEDIA_BACKUP_S3_SECRET_KEY: "fixture-secret",
  } })).stdout;
  assert.ok((await run()).includes('"uploaded":2'));
  assert.equal(remote.size, 2);
  const pdf = remote.get("/fixture-backup/qr/workspace/a.pdf");
  assert.equal(pdf.body.toString(), "private document"); assert.equal(pdf.mime, "application/pdf");
  assert.equal(pdf.checksum, createHash("sha256").update(pdf.body).digest("hex"));
  assert.ok((await run()).includes('"unchanged":2'));
  await rm(join(media, "qr/workspace/a.pdf"));
  await writeFile(join(media, "qr/blog/content/a.webp"), "changed image");
  assert.ok((await run()).includes('"uploaded":1'));
  assert.ok(remote.has("/fixture-backup/qr/workspace/a.pdf"));
  assert.equal(remote.get("/fixture-backup/qr/blog/content/a.webp").body.toString(), "changed image");
  console.log("PASS: actual S3 SDK over HTTPS, private copies, SHA-256 metadata, incremental sync and deletion retention");
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(root, { recursive: true, force: true });
}
