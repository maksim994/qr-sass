import type { BlogPost, Prisma } from "@prisma/client";

export type BlogActor = { actorId: string | null; actorName: string; source: "admin" | "api" | "system" };
export const articleFields = ["title", "slug", "metaTitle", "metaDescription", "excerpt", "content", "format", "renderedHtml", "legacyHtml", "faq", "showPrintSizeIntro", "coverImageUrl", "authorName", "structuredData", "readingTimeMinutes", "categoryId", "status", "scheduledAt", "publishedAt", "firstPublishedAt", "contentUpdatedAt"] as const;
export function articleStatus(post: { status?: string | null; publishedAt: Date | string | null }) {
  return post.status ?? (post.publishedAt ? "published" : "draft");
}
export function articleSnapshot(post: BlogPost): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(Object.fromEntries(articleFields.map(key => [key, key === "status" ? articleStatus(post) : post[key]]))));
}
export function changedArticleFields(before: Prisma.InputJsonObject, after: Prisma.InputJsonObject) {
  return articleFields.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}
export async function recordSave(tx: Prisma.TransactionClient, before: BlogPost | null, post: BlogPost, actor: BlogActor, comment?: string, restoreId?: string) {
  const latest = await tx.blogRevision.findFirst({ where: { postId: post.id }, orderBy: { number: "desc" }, select: { number: true } });
  let number = latest?.number ?? 0;
  if (!latest && before) {
    await tx.blogRevision.create({ data: { postId: post.id, number: 0, snapshot: articleSnapshot(before), actorId: null, actorName: "До включения истории", source: "system", comment: "Исходное состояние перед первым изменением" } });
  }
  const revision = await tx.blogRevision.create({ data: { postId: post.id, number: ++number, snapshot: articleSnapshot(post), ...actor, comment } });
  const fields = before ? changedArticleFields(articleSnapshot(before), articleSnapshot(post)) : [...articleFields];
  const types = [restoreId ? "restore" : before ? "update" : "create"];
  if (articleStatus(post) === "published" && (!before || articleStatus(before) !== "published")) types.push("publish");
  if (before && articleStatus(before) === "published" && articleStatus(post) !== "published") types.push("unpublish");
  if (articleStatus(post) === "scheduled" && (!before || before.scheduledAt?.getTime() !== post.scheduledAt?.getTime())) types.push("schedule");
  await tx.blogEvent.createMany({ data: types.map(type => ({ postId: post.id, postTitle: post.title, ...actor, type, fields, comment: restoreId ? `Восстановлена версия ${restoreId}${comment ? ` · ${comment}` : ""}` : comment, revisionId: revision.id })) });
  return post;
}
