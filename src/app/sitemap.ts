import { seoPageSitemapState } from "@/lib/seo-page-overrides";
import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { buildSitemapEntries } from "@/lib/sitemap-entries";
import { renderArticleBody } from "@/lib/blog-render";
import { blogImageUrls } from "@/lib/blog-media-html";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  // Let DB failures return 5xx for a retry, rather than publishing a successful
  // but incomplete sitemap that silently drops every blog article.
  const [pages, blogPosts] = await Promise.all([
    seoPageSitemapState(),
    db.blogPost.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, publishedAt: true, updatedAt: true, contentUpdatedAt: true, content: true, format: true, faq: true, coverImageUrl: true },
    }),
  ]);
  return buildSitemapEntries(pages, blogPosts.map(post => ({
    ...post,
    images: blogImageUrls(renderArticleBody(post.content, post.format === "markdown" ? "markdown" : "html", post.faq).html, post.coverImageUrl),
  })));
}
