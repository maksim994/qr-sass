import { publicOrigin } from "@/lib/public-url";

export const LEGACY_BLOG_MEDIA = "https://s3.mvmolkov.ru/qr/blog/";
export const BLOG_MEDIA_PATH = "/media/blog/";

/** Only the two public editorial directories; never a workspace or arbitrary bucket key. */
export function blogMediaKey(parts: readonly string[]): string | null {
  if (parts.length !== 2 || !["covers", "content"].includes(parts[0])) return null;
  if (!/^[A-Za-z0-9_-]{1,200}\.(?:webp|png|jpe?g|gif)$/i.test(parts[1])) return null;
  return `qr/blog/${parts.join("/")}`;
}
export function blogMediaUrlForKey(key: string): string {
  const parts = key.startsWith("qr/blog/") ? key.slice(8).split("/") : [];
  if (!blogMediaKey(parts)) throw new Error("Invalid public blog media key");
  return `${publicOrigin()}${BLOG_MEDIA_PATH}${parts.join("/")}`;
}
export function blogMediaKeyFromUrl(value: string): string | null {
  try {
    const url = new URL(value, publicOrigin());
    if (url.username || url.password) return null;
    if (url.origin === "https://s3.mvmolkov.ru" && url.pathname.startsWith("/qr/blog/"))
      return blogMediaKey(url.pathname.slice(9).split("/"));
    if ([new URL(publicOrigin()).origin, "https://qr-s.ru"].includes(url.origin) && url.pathname.startsWith(BLOG_MEDIA_PATH))
      return blogMediaKey(url.pathname.slice(BLOG_MEDIA_PATH.length).split("/"));
  } catch { /* Leave unrecognized/external URLs alone. */ }
  return null;
}
export function blogMediaUrl(value: string): string {
  if (!value.startsWith(LEGACY_BLOG_MEDIA)) return value;
  const key = blogMediaKeyFromUrl(value);
  if (!key) return value;
  const url = new URL(value);
  return blogMediaUrlForKey(key) + url.search + url.hash;
}
/** Next Image optimizes same-origin media as a local path, without remote allowlists/self-fetch redirects. */
export function blogMediaImageSrc(value: string): string {
  const url = blogMediaUrl(value);
  return blogMediaKeyFromUrl(url) ? new URL(url, publicOrigin()).pathname + new URL(url, publicOrigin()).search : url;
}
/** Match public and storage URLs without rewriting the stored article source. */
export function sameBlogImageUrl(a: string | null | undefined, b: string): boolean {
  if (a === b) return true;
  if (!a) return false;
  const ak = blogMediaKeyFromUrl(a), bk = blogMediaKeyFromUrl(b);
  if (!ak || ak !== bk) return false;
  const x = new URL(a, publicOrigin()), y = new URL(b, publicOrigin());
  return x.search === y.search && x.hash === y.hash;
}
export function blogImageUrlAliases(value: string): string[] {
  const key = blogMediaKeyFromUrl(value);
  if (!key) return [value];
  const url = new URL(value, publicOrigin()), suffix = url.search + url.hash;
  return [...new Set([value, blogMediaUrlForKey(key) + suffix, LEGACY_BLOG_MEDIA + key.slice(8) + suffix])];
}
export function blogMediaSrcset(srcset: string): string {
  return srcset.replace(/(^|[\s,])(https:\/\/s3\.mvmolkov\.ru\/qr\/blog\/[^\s,]+)/g, (_whole, space: string, url: string) => space + blogMediaUrl(url));
}
