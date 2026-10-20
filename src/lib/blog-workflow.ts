import { createHash, randomBytes } from "node:crypto";
import type { BlogPost, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { BlogEditorError, prepareArticleSave, type BlogEditorInput } from "@/lib/blog-editor";
import { renderArticleBody } from "@/lib/blog-render";
import { readBlogFaq } from "@/lib/blog-faq";
import { MSG } from "@/lib/user-messages";

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
async function recordSave(tx: Prisma.TransactionClient, before: BlogPost | null, post: BlogPost, actor: BlogActor, comment?: string, restoreId?: string) {
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
export async function saveArticle(input: BlogEditorInput, actor: BlogActor, id?: string) {
  return getDb().$transaction(async tx => {
    const before = id ? await tx.blogPost.findUnique({ where: { id } }) : null;
    if (id && !before) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    const data = prepareArticleSave(input, before);
    const post = before
      ? await tx.blogPost.update({ where: { id: before.id, updatedAt: before.updatedAt }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) } })
      : await tx.blogPost.create({ data: { ...data, createdById: actor.actorId } });
    return recordSave(tx, before, post, actor, input.comment);
  });
}
export async function restoreArticle(id: string, revisionId: string, expectedUpdatedAt: string, actor: BlogActor) {
  return getDb().$transaction(async tx => {
    const [before, revision] = await Promise.all([
      tx.blogPost.findUnique({ where: { id } }), tx.blogRevision.findFirst({ where: { id: revisionId, postId: id } }),
    ]);
    if (!before) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    if (!revision) throw new BlogEditorError(MSG.BLOG_VERSION_NOT_FOUND, 404);
    if (before.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
    const snapshot = revision.snapshot as Record<string, unknown>;
    // Never recreate counters, identity, ownership or a previously published URL from a snapshot.
    if ((before.firstPublishedAt || before.publishedAt) && snapshot.slug !== before.slug) throw new BlogEditorError(MSG.BLOG_SLUG_LOCKED, 409);
    const data = Object.fromEntries(articleFields.map(key => [key, snapshot[key]])) as Prisma.BlogPostUncheckedUpdateInput;
    for (const key of ["publishedAt", "scheduledAt", "contentUpdatedAt", "firstPublishedAt"] as const) data[key] = snapshot[key] ? new Date(String(snapshot[key])) : null;
    data.firstPublishedAt = before.firstPublishedAt ?? before.publishedAt ?? data.firstPublishedAt;
    data.updatedAt = new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1));
    data.contentUpdatedAt = new Date();
    data.faq = readBlogFaq(snapshot.faq);
    data.renderedHtml = snapshot.format === "markdown" ? renderArticleBody(String(snapshot.content), "markdown", data.faq).html : null;
    if (snapshot.status === "published") data.publishedAt = data.firstPublishedAt ?? new Date();
    // Retain the exact legacy backup even when restoring an earlier Markdown revision.
    data.legacyHtml = before.legacyHtml ?? (typeof snapshot.legacyHtml === "string" ? snapshot.legacyHtml : null);
    const post = await tx.blogPost.update({ where: { id, updatedAt: before.updatedAt }, data });
    return recordSave(tx, before, post, actor, undefined, `№${revision.number}`);
  });
}
export async function publishDueArticles(now = new Date()) {
  const db = getDb();
  const due = await db.blogPost.findMany({ where: { status: "scheduled", scheduledAt: { lte: now } }, select: { id: true }, take: 100, orderBy: { scheduledAt: "asc" } });
  const published: string[] = [];
  for (const { id } of due) {
    try {
      const post = await db.$transaction(async tx => {
        const before = await tx.blogPost.findUnique({ where: { id } });
        if (!before || before.status !== "scheduled" || !before.scheduledAt || before.scheduledAt > now) return null;
        const firstPublishedAt = before.firstPublishedAt ?? before.scheduledAt;
        const post = await tx.blogPost.update({ where: { id, status: "scheduled", updatedAt: before.updatedAt }, data: { updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)), status: "published", scheduledAt: null, publishedAt: firstPublishedAt, firstPublishedAt, contentUpdatedAt: before.contentUpdatedAt ?? before.updatedAt } });
        return recordSave(tx, before, post, { actorId: null, actorName: "Планировщик публикаций", source: "system" }, "Автоматическая публикация по расписанию");
      });
      if (post) published.push(post.slug);
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2025")) throw error;
    }
  }
  return published;
}
export function hashPreviewToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function changePreviewToken(id: string, actor: BlogActor, revoke = false) {
  const token = randomBytes(32).toString("base64url");
  await getDb().$transaction(async tx => {
    // Serialize concurrent rotations without changing the article's editorial timestamp.
    const rows = await tx.$queryRaw<{ id: string; title: string }[]>`SELECT "id", "title" FROM "BlogPost" WHERE "id" = ${id} FOR UPDATE`;
    if (!rows[0]) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    await tx.blogPreviewToken.updateMany({ where: { postId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!revoke) await tx.blogPreviewToken.create({ data: { postId: id, hash: hashPreviewToken(token) } });
    await tx.blogEvent.create({ data: { postId: id, postTitle: rows[0].title, ...actor, type: revoke ? "preview_revoke" : "preview_create", fields: [] } });
  });
  return revoke ? null : `/preview/${token}`;
}

export async function deleteArticle(id: string, actor: BlogActor) {
  return getDb().$transaction(async tx => {
    const before = await tx.blogPost.findUnique({ where: { id } });
    if (!before) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    // Match the current row before deleting, so a concurrent save cannot silently disappear.
    await tx.blogPost.delete({ where: { id, updatedAt: before.updatedAt } });
    const any = await tx.blogRevision.findFirst({ where: { postId: id }, select: { id: true } });
    if (!any) await tx.blogRevision.create({ data: { postId: id, number: 0, snapshot: articleSnapshot(before), ...actor, comment: "Состояние перед удалением" } });
    await tx.blogEvent.create({ data: { postId: id, postTitle: before.title, ...actor, type: "delete", fields: [] } });
  });
}
