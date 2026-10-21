import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { BLOG_REDIRECTS } from "@/lib/blog-redirects";
import { BlogEditorError } from "@/lib/blog-editor";
import { MSG } from "@/lib/user-messages";

export async function validateRelatedArticles(tx: Prisma.TransactionClient, ids: string[], selfId?: string) {
  if (ids.includes(selfId ?? "") || new Set(ids).size !== ids.length ||
    (ids.length && await tx.blogPost.count({ where: { id: { in: ids } } }) !== ids.length)) {
    throw new BlogEditorError(MSG.BLOG_RELATED_INVALID);
  }
}
export type RelatedCandidate = { id: string; categoryId: string | null; tags: string[]; publishedAt: Date | null };
export function rankRelatedArticles(post: { id: string; categoryId: string | null; tags: string[]; relatedArticleIds: string[] }, candidates: RelatedCandidate[]) {
  const common = (p: RelatedCandidate) => p.tags.filter(tag => post.tags.includes(tag)).length;
  const category = (p: RelatedCandidate) => Number(!!post.categoryId && p.categoryId === post.categoryId);
  const manual = (p: RelatedCandidate) => { const index = post.relatedArticleIds.indexOf(p.id); return index < 0 ? Infinity : index; };
  return candidates.filter(p => p.id !== post.id && p.publishedAt).sort((a, b) =>
    (manual(a) === manual(b) ? 0 : manual(a) - manual(b)) || category(b) - category(a) || common(b) - common(a) ||
    b.publishedAt!.getTime() - a.publishedAt!.getTime() || a.id.localeCompare(b.id)
  ).slice(0, 3).map(p => p.id);
}
export async function relatedArticles(post: { id: string; categoryId: string | null; tags: string[]; relatedArticleIds: string[] }) {
  const db = getDb();
  const redirects = await db.blogRedirect.findMany({ where: { source: { startsWith: "/blog/" } }, select: { source: true } });
  const excluded = [...Object.keys(BLOG_REDIRECTS), ...redirects.map(row => row.source.slice(6))];
  const candidates = await db.blogPost.findMany({
    where: { id: { not: post.id }, publishedAt: { not: null }, slug: { notIn: excluded } },
    select: { id: true, categoryId: true, tags: true, publishedAt: true },
  });
  const ids = rankRelatedArticles(post, candidates);
  const rows = await db.blogPost.findMany({ where: { id: { in: ids } }, select: {
    id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, publishedAt: true, readingTimeMinutes: true,
    category: { select: { slug: true, name: true } },
  } });
  return ids.flatMap(id => rows.filter(row => row.id === id));
}
