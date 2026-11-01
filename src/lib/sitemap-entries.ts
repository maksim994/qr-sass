import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-url";
import { blogPostIndexing, isDeniedSitemapPath, sitemapPathname } from "@/lib/seo-hygiene";
import sourceDates from "./seo-source-dates.json" with { type: "json" };

export type SitemapPage = { path: string; noindex: boolean; updatedAt: Date | null };
export type SitemapPost = {
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  contentUpdatedAt: Date | null;
  images: string[];
};

function latest(...dates: (Date | string | null | undefined)[]): Date | undefined {
  const timestamps = dates.filter(date => date != null).map(date => new Date(date!).getTime()).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
}

/** Pure assembly shared by the route and regression tests. No DB errors become a partial sitemap. */
export function buildSitemapEntries(pages: SitemapPage[], posts: SitemapPost[]): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const codeDates: Record<string, { lastModified: string }> = sourceDates;
  for (const page of pages) {
    const path = sitemapPathname(publicSiteUrl(page.path));
    if (page.noindex || isDeniedSitemapPath(path)) continue;
    entries.set(path, {
      url: publicSiteUrl(path === "/" ? "" : path),
      lastModified: latest(codeDates[path]?.lastModified, page.updatedAt),
    });
  }
  let blogModified: Date | undefined;
  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    if (!post.publishedAt || !post.slug || isDeniedSitemapPath(path) || !blogPostIndexing(post.slug).index) continue;
    const lastModified = latest(post.contentUpdatedAt ?? post.updatedAt, post.publishedAt);
    entries.set(path, { url: publicSiteUrl(path), lastModified, images: post.images });
    blogModified = latest(blogModified, lastModified);
  }
  const blog = entries.get("/blog");
  if (blog) blog.lastModified = latest(blog.lastModified, blogModified);
  return [...entries.values()];
}
