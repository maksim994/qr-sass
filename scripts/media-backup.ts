import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { mediaConfig, mediaBackupConfig } from "@/lib/media-config";
import { backupMedia, type MediaBackupTarget } from "@/lib/media-backup";

async function main() {
  const config = mediaBackupConfig();
  if (!config) {
    console.log("Media backup is disabled: configure MEDIA_BACKUP_S3_* variables");
    if (process.argv.includes("--loop")) for (;;) await delay(24 * 60 * 60 * 1000);
    return;
  }
  const client = new S3Client({ ...config, forcePathStyle: true });
  const target: MediaBackupTarget = {
    async checksum(key) {
      try {
        const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(30000) });
        return object.Metadata?.sha256;
      } catch (error) {
        if (error && typeof error === "object" && "$metadata" in error && (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404) return undefined;
        throw error;
      }
    },
    async put(key, body, contentType, checksum) {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType, Metadata: { sha256: checksum } }), { abortSignal: AbortSignal.timeout(60000) });
    },
  };
  const loop = process.argv.includes("--loop");
  do {
    let success = false;
    try {
      const result = await backupMedia(mediaConfig().MEDIA_ROOT, target);
      await writeFile("/tmp/media-backup-success", String(Date.now()), { mode: 0o600 });
      console.log(JSON.stringify({ time: new Date().toISOString(), status: "ok", ...result }));
      success = true;
    } catch {
      // SDK errors may contain provider/credential information. Only report state.
      console.error("Media backup failed; last successful copy is unchanged");
      if (!loop) { process.exitCode = 1; return; }
    }
    if (loop) await delay(success ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
  } while (loop);
}
main().catch(() => { console.error("Media backup configuration/startup failed"); process.exitCode = 1; });
