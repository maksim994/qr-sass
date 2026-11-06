import { readFile } from "node:fs/promises";
const names = ["ENDPOINT", "BUCKET", "ACCESS_KEY", "SECRET_KEY"];
if (names.every(name => !process.env[`MEDIA_BACKUP_S3_${name}`])) process.exit(0);
try {
  const lastSuccess = Number(await readFile("/tmp/media-backup-success", "utf8"));
  process.exit(Number.isFinite(lastSuccess) && Date.now() - lastSuccess < 26 * 60 * 60 * 1000 ? 0 : 1);
} catch { process.exit(1); }
