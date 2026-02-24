import crypto from "node:crypto";
import { parse, validate } from "@tma.js/init-data-node";

export function verifyTelegramInitData(initDataRaw: string, botToken: string) {
  validate(initDataRaw, botToken, { expiresIn: 3600 });
  return parse(initDataRaw);
}

const AUTH_MAX_AGE_SEC = 3600; // 1 hour

export function verifyTelegramInitDataFallback(initDataRaw: string, botToken: string) {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) return false;

  const authDateStr = params.get("auth_date");
  if (!authDateStr) return false;
  const authDate = parseInt(authDateStr, 10);
  if (Number.isNaN(authDate)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > AUTH_MAX_AGE_SEC) return false;

  params.delete("hash");

  const sorted = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const signature = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  return signature === hash;
}
