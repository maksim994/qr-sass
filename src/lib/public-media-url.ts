import { publicOrigin } from "@/lib/public-url";
import { blogMediaKey, blogMediaUrlForKey } from "@/lib/blog-media-url";

/** Public raster images only. Workspace assets are never reachable through /media/assets. */
export function publicAssetKey(parts: readonly string[]): string | null {
  if (parts[0] === "avatars" && parts.length === 3 && /^[A-Za-z0-9_-]{1,200}$/.test(parts[1]) && /^[A-Za-z0-9_-]{1,200}\.(?:webp|png|jpe?g|gif)$/i.test(parts[2])) return `qr/${parts.join("/")}`;
  if (parts[0] === "site" && parts.length === 2 && /^favicon_[A-Za-z0-9_-]{1,200}\.(?:ico|png|webp)$/i.test(parts[1])) return `qr/${parts.join("/")}`;
  return null;
}
export function localPublicMediaUrl(key: string): string | null {
  if (key.startsWith("qr/blog/") && blogMediaKey(key.slice(8).split("/"))) return blogMediaUrlForKey(key);
  const parts = key.startsWith("qr/") ? key.slice(3).split("/") : [];
  return publicAssetKey(parts) ? `${publicOrigin()}/media/assets/${parts.join("/")}` : null;
}
