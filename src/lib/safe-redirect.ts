/**
 * Internal-path redirect helper. Rejects protocol-relative and external URLs.
 * `startsWith("/")` is not enough: `//evil.com` and `/\evil.com` are open redirects.
 */

import { isSafeUrl } from "@/lib/url";

const PUBLIC_QR_PATH = /^\/(r|p|g|v)\/[A-Za-z0-9_-]+$/;
const CREATE_TYPE_PATH = /^\/dashboard\/create\/[a-z0-9-]+$/;
const POST_AUTH_MAX_URL = 2000;

function parseSameOriginPath(input: string | null | undefined): URL | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  if (trimmed.includes("\\") || /[\u0000-\u001f]/.test(trimmed)) return null;

  try {
    const base = "https://qr-s.invalid";
    const url = new URL(trimmed, base);
    if (url.origin !== base) return null;
    if (url.username || url.password) return null;
    if (url.pathname.startsWith("//")) return null;
    return url;
  } catch {
    return null;
  }
}

export function safeInternalPath(input: string | null | undefined, fallback: string): string {
  const url = parseSameOriginPath(input);
  if (!url) return fallback;
  const allowed =
    url.pathname === "/" ||
    url.pathname === "/expired" ||
    url.pathname === "/unavailable" ||
    PUBLIC_QR_PATH.test(url.pathname);
  if (!allowed) return fallback;
  return `${url.pathname}${url.search}`;
}

/** After login/register: explicit dashboard destinations only, never an open redirect. */
export function safePostAuthPath(input: string | null | undefined, fallback = "/dashboard"): string {
  const url = parseSameOriginPath(input);
  if (!url) return fallback;
  const path = url.pathname;
  const allowed = path === "/dashboard" || path === "/dashboard/create" ||
    path === "/dashboard/bulk" || path === "/dashboard/analytics" || CREATE_TYPE_PATH.test(path);
  if (!allowed) return fallback;

  const next = new URL(path, "https://qr-s.invalid");
  const kind = url.searchParams.get("kind");
  if (kind === "STATIC" || kind === "DYNAMIC") {
    next.searchParams.set("kind", kind);
  }
  const rawUrl = url.searchParams.get("url");
  if (rawUrl && rawUrl.length <= POST_AUTH_MAX_URL && isSafeUrl(rawUrl)) {
    next.searchParams.set("url", rawUrl);
  }
  return `${next.pathname}${next.search}`;
}

export function qrPublicPath(input: {
  shortCode: string;
  contentType: string;
}): string {
  const code = input.shortCode;
  if (input.contentType === "VCARD") return `/v/${code}`;
  const hosted = [
    "PDF",
    "IMAGE",
    "VIDEO",
    "MP3",
    "MENU",
    "BUSINESS",
    "LINK_LIST",
    "COUPON",
    "SOCIAL_LINKS",
  ].includes(input.contentType);
  if (hosted) return `/p/${code}`;
  return `/r/${code}`;
}
