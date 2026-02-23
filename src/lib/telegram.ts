import crypto from "node:crypto";
import { parse, validate } from "@tma.js/init-data-node";

export function verifyTelegramInitData(initDataRaw: string, botToken: string) {
  validate(initDataRaw, botToken, { expiresIn: 3600 });
  return parse(initDataRaw);
}

export function verifyTelegramInitDataFallback(initDataRaw: string, botToken: string) {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");

  const sorted = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const signature = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  return signature === hash;
}
