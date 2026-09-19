import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { publicOrigin } from "@/lib/public-url";
import { buildIndexableStaticPaths, isDeniedSitemapPath } from "@/lib/seo-hygiene";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicOrigin();

  const staticEntries: MetadataRoute.Sitemap = buildIndexableStaticPaths()
    .filter((path) => !isDeniedSitemapPath(path))
    .map((path) => ({
      url: path === "/" ? base : `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : path === "/blog" ? 0.8 : 0.7,
    }));

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const db = getDb();
    const blogPosts = await db.blogPost.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
    });
    blogEntries = blogPosts
      .filter((post) => post.slug && !isDeniedSitemapPath(`/blog/${post.slug}`))
      .map((post) => ({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    blogEntries = [];
  }

  return [...staticEntries, ...blogEntries].filter((entry) => !isDeniedSitemapPath(entry.url));
}
