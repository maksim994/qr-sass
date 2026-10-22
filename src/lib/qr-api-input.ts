import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const QR_API_SCOPES = ["qr:read", "qr:write", "stats:read"] as const;
export type QrApiScope = typeof QR_API_SCOPES[number];
export const qrApiKeySchema = z.object({
  name: z.string().trim().min(1).max(64),
  scopes: z.array(z.enum(QR_API_SCOPES)).min(1).max(3).refine(v => new Set(v).size === v.length),
}).strict();
export const qrApiTarget = z.string().trim().max(2048).url().refine(value => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
});
export const qrApiCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetUrl: qrApiTarget,
  source: z.enum(["api", "bitrix_module"]).default("api"),
}).strict();
export const qrApiUpdateSchema = z.object({ targetUrl: qrApiTarget }).strict();
export const qrApiListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict();
export const qrApiImageSchema = z.object({
  format: z.enum(["svg", "png"]).default("png"),
  size: z.coerce.number().int().min(128).max(2048).default(600),
  foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111111"),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).default("H"),
}).strict();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const date = new Date(`${v}T00:00:00.000Z`);
  return !isNaN(+date) && date.toISOString().slice(0, 10) === v;
});
export const qrApiStatsSchema = z.object({ from: day, to: day }).strict().refine(({ from, to }) => {
  const duration = Date.parse(to) - Date.parse(from);
  return duration >= 0 && duration < 366 * 86400000;
});
export function hashQrApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
export function generateQrApiKey() {
  const key = `qrs_api_${randomBytes(32).toString("base64url")}`;
  return { key, keyHash: hashQrApiKey(key), keyPrefix: key.slice(0, 16) };
}
export function readQrBearer(request: Request) {
  const match = /^Bearer (qrs_api_[A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  return match?.[1] ?? null;
}
