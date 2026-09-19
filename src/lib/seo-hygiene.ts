import { getSeoPages } from "@/lib/seo-content";
import { publicOrigin } from "@/lib/public-url";

/** Paths that must never appear in sitemap.xml. */
export const SITEMAP_DENY_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/admin",
  "/expired",
  "/unavailable",
  "/preview",
  "/mini",
  "/api",
] as const;

/** Always-on marketing/legal URLs. Blog posts and SEO landings are added separately. */
export const INDEXABLE_STATIC_PATHS = [
  "/",
  "/blog",
  "/changelog",
  "/qr-lifetime",
  "/privacy-policy",
  "/terms-of-service",
] as const;

const CUSTOMER_QR_PATH = /^\/(r|p|g|v)(\/|$)/;

export function sitemapPathname(urlOrPath: string): string {
  try {
    if (/^https?:\/\//i.test(urlOrPath)) {
      return normalizePathname(new URL(urlOrPath).pathname);
    }
  } catch {
    /* fall through */
  }
  return normalizePathname(urlOrPath.split("?")[0] ?? "/");
}

function normalizePathname(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function isDeniedSitemapPath(urlOrPath: string): boolean {
  const path = sitemapPathname(urlOrPath);
  if (CUSTOMER_QR_PATH.test(path)) return true;
  return SITEMAP_DENY_PATHS.some((deny) => path === deny || path.startsWith(`${deny}/`));
}

export function buildIndexableStaticPaths(): string[] {
  const fromLandings = getSeoPages().map((page) => `/${page.slug}`);
  return [...INDEXABLE_STATIC_PATHS, ...fromLandings].filter((path) => !isDeniedSitemapPath(path));
}

export function findSitemapServiceUrls(urls: string[]): string[] {
  return urls.filter((url) => isDeniedSitemapPath(url));
}

/**
 * Private surfaces: Disallow so they are not crawled.
 * Auth and utility pages stay crawlable so robots can read noindex and drop
 * leftovers that were previously listed in sitemap (login/register).
 * Customer /r /p /g /v are not Disallowed for the same reason.
 */
export function getDefaultRobotsTxt(origin = publicOrigin()): string {
  return `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /preview
Disallow: /mini

Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&utm_id&yclid&ysclid&fbclid&gclid

Sitemap: ${origin}/sitemap.xml`;
}

export function pathNeedsNoindexHeader(pathname: string): boolean {
  const path = sitemapPathname(pathname);
  if (CUSTOMER_QR_PATH.test(path)) return true;
  return (
    path === "/login" ||
    path === "/register" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/expired" ||
    path === "/unavailable" ||
    path === "/preview" ||
    path.startsWith("/preview/") ||
    path === "/mini" ||
    path.startsWith("/mini/") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/admin")
  );
}

export const NOINDEX_ROBOTS = { index: false, follow: false } as const;

export function blogListIndexing(page: number, categorySlug?: string | null): {
  canonicalPath: "/blog";
  robots: { index: boolean; follow: boolean };
} {
  const filtered = Boolean(categorySlug) || page > 1;
  return {
    canonicalPath: "/blog",
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
  };
}
