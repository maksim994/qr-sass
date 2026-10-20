import { cache } from "react";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { blogImageUrlAliases, blogMediaKeyFromUrl, blogMediaUrl } from "@/lib/blog-media-url";
import { blogMedia } from "@/lib/blog-media";
import type { ImageVariant } from "@/lib/blog-image-markup";

/** Share lookup/probe between metadata and page; existing cover dimensions are measured, never guessed. */
export const getBlogCoverImage = cache(async (url: string | null) => {
  if (!url) return null;
  const asset = await getDb().blogImage.findFirst({ where: { url: { in: blogImageUrlAliases(url) } } });
  if (asset) return { url: blogMediaUrl(url), width: asset.width, height: asset.height, variants: (asset.variants as ImageVariant[]).map(v => ({ ...v, url: blogMediaUrl(v.url) })) };
  const key = blogMediaKeyFromUrl(url);
  if (key) {
    try {
      const file = await blogMedia.object(key, false);
      if (file?.body) {
        const { width, height } = await sharp(file.body).metadata();
        if (width && height) return { url: blogMediaUrl(url), width, height, variants: [] as ImageVariant[] };
      }
    } catch { /* A storage outage must not make the article unavailable. */ }
  }
  return null;
});
