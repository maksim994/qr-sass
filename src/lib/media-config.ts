import { z } from "zod";
import { isAbsolute } from "node:path";

// Storage configuration is also used by offline tools, without auth/payment env.
export const mediaEnvSchema = z.object({
  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  MEDIA_ROOT: z.string().min(1).refine(isAbsolute, "MEDIA_ROOT must be absolute").default("/data/media"),
});
export function mediaConfig() { return mediaEnvSchema.parse(process.env); }

export const mediaBackupEnvSchema = z.object({
  MEDIA_BACKUP_S3_ENDPOINT: z.string().optional(),
  MEDIA_BACKUP_S3_BUCKET: z.string().optional(),
  MEDIA_BACKUP_S3_ACCESS_KEY: z.string().optional(),
  MEDIA_BACKUP_S3_SECRET_KEY: z.string().optional(),
  MEDIA_BACKUP_S3_REGION: z.string().default("us-east-1"),
});
export function mediaBackupConfig(input: NodeJS.ProcessEnv = process.env) {
  const config = mediaBackupEnvSchema.parse(input);
  const values = [config.MEDIA_BACKUP_S3_ENDPOINT, config.MEDIA_BACKUP_S3_BUCKET, config.MEDIA_BACKUP_S3_ACCESS_KEY, config.MEDIA_BACKUP_S3_SECRET_KEY];
  if (values.every(value => !value)) return null;
  if (values.some(value => !value)) throw new Error("Set all four MEDIA_BACKUP_S3_* connection variables");
  const endpoint = new URL(config.MEDIA_BACKUP_S3_ENDPOINT!);
  const host = endpoint.hostname.toLowerCase();
  const primaryHost = input.S3_ENDPOINT ? new URL(input.S3_ENDPOINT).hostname.toLowerCase() : "";
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || host === "s3.mvmolkov.ru" || host === primaryHost || /(^|\.)beget\.(cloud|com|ru)$/.test(host))
    throw new Error("Media backup requires a separate HTTPS S3 provider outside Beget");
  return { endpoint: endpoint.href, bucket: config.MEDIA_BACKUP_S3_BUCKET!, region: config.MEDIA_BACKUP_S3_REGION,
    credentials: { accessKeyId: config.MEDIA_BACKUP_S3_ACCESS_KEY!, secretAccessKey: config.MEDIA_BACKUP_S3_SECRET_KEY! } };
}
