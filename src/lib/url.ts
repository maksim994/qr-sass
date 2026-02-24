const ALLOWED_SCHEMES = ["https:", "http:"] as const;

/**
 * Returns true if the URL uses an allowed protocol (http/https).
 * Prevents javascript:, data:, and other dangerous schemes.
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url);
    return ALLOWED_SCHEMES.includes(u.protocol as (typeof ALLOWED_SCHEMES)[number]);
  } catch {
    return false;
  }
}
