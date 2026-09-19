/**
 * URL safety helpers: scheme allowlist + SSRF protections for user-supplied URLs.
 */

const ALLOWED_SCHEMES = ["https:", "http:"] as const;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "0.0.0.0",
  "255.255.255.255",
]);

function stripBrackets(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function hexPairToIpv4(high: string, low: string): string {
  const hi = Number.parseInt(high, 16);
  const lo = Number.parseInt(low, 16);
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

export function ipv4FromMapped(hostname: string): string | null {
  const inner = stripBrackets(hostname);
  const dotted = inner.match(/(?:^|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (dotted?.[1]) return dotted[1];
  const hex = inner.match(/(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) return hexPairToIpv4(hex[1], hex[2]);
  return null;
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const mapped = ipv4FromMapped(hostname);
  const candidate = mapped ?? hostname;
  const m = candidate.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const parts = m.slice(1).map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const inner = stripBrackets(hostname);
  if (!inner.includes(":")) return false;
  if (inner === "::1" || inner === "::") return true;
  const mapped = ipv4FromMapped(inner);
  if (mapped) return isPrivateOrLocalIpv4(mapped);
  if (inner.startsWith("fc") || inner.startsWith("fd") || inner.startsWith("fe80")) return true;
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = stripBrackets(hostname);
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isPrivateOrLocalIpv4(host) || isPrivateOrLocalIpv6(host)) return true;
  return false;
}

export function isHostedAssetPath(url: string): boolean {
  return /^\/api\/qr\/[A-Za-z0-9_-]+\/asset(?:\?.*)?$/.test(url.trim());
}

export function isDisplayableMediaUrl(url: string): boolean {
  return isSafeUrl(url) || isHostedAssetPath(url);
}

/**
 * Returns true if the URL uses an allowed protocol (http/https)
 * and does not target obvious private/local hosts (SSRF baseline).
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url);
    if (!ALLOWED_SCHEMES.includes(u.protocol as (typeof ALLOWED_SCHEMES)[number])) return false;
    if (isBlockedHostname(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
