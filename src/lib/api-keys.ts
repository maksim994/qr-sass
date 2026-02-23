import { createHash, randomBytes } from "crypto";

const PREFIX = "qre_";
const PREFIX_LEN = 8; // chars after "qre_"
const KEY_LEN = 32;

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(KEY_LEN).toString("base64url").slice(0, KEY_LEN);
  const key = `${PREFIX}${raw}`;
  const prefix = key.slice(0, PREFIX.length + PREFIX_LEN);
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export function verifyApiKey(key: string, storedPrefix: string, storedHash: string): boolean {
  if (!key.startsWith(PREFIX) || key.length < PREFIX.length + PREFIX_LEN) return false;
  const prefix = key.slice(0, PREFIX.length + PREFIX_LEN);
  if (prefix !== storedPrefix) return false;
  const hash = createHash("sha256").update(key).digest("hex");
  return hash === storedHash;
}
