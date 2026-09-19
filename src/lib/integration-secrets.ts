import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
export function integrationKeyReady() {
  return (
    !!env.ADMIN_INTEGRATIONS_KEY &&
    Buffer.from(env.ADMIN_INTEGRATIONS_KEY, "base64").length === 32
  );
}
function key() {
  if (!integrationKeyReady())
    throw new Error("Integration encryption is not configured");
  return Buffer.from(env.ADMIN_INTEGRATIONS_KEY!, "base64");
}
export function encryptIntegrationSecret(secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((v) => v.toString("base64"))
    .join(".");
}
export function decryptIntegrationSecret(value: string) {
  const [iv, tag, encrypted] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString(
    "utf8",
  );
}
