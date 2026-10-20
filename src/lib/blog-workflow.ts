import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { BlogEditorError, prepareArticleSave, type BlogEditorInput } from "@/lib/blog-editor";
import { renderArticleBody } from "@/lib/blog-render";
import { readBlogFaq } from "@/lib/blog-faq";
import { MSG } from "@/lib/user-messages";
import { assertActiveBlogToken } from "@/lib/blog-api-tokens";

// Keep the scheduler and snapshot writer independent of renderer dependencies in the worker image.
import { articleFields, articleSnapshot, recordSave, type BlogActor } from "@/lib/blog-versions";
export { articleStatus } from "@/lib/blog-versions";
export type { BlogActor } from "@/lib/blog-versions";

export async function saveArticle(input: BlogEditorInput, actor: BlogActor, id?: string) {
  return (await persistArticle(input, actor, id)).post;
}
export async function saveArticleApi(input: BlogEditorInput, actor: BlogActor, tokenId: string, id?: string, version?: number) {
  return persistArticle(input, actor, id, { tokenId, version });
}
async function persistArticle(input: BlogEditorInput, actor: BlogActor, id?: string, api?: { tokenId: string; version?: number }) {
  return getDb().$transaction(async tx => {
    if (api) await assertActiveBlogToken(tx, api.tokenId);
    const before = id ? await tx.blogPost.findUnique({ where: { id } }) : null;
    if (id && !before) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    if (before && api) {
      const latest = await tx.blogRevision.findFirst({ where: { postId: id }, orderBy: { number: "desc" }, select: { number: true } });
      if (api.version !== (latest?.number ?? 0)) throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
    }
    const data = prepareArticleSave(input, before);
    const post = before
      ? await tx.blogPost.update({ where: { id: before.id, updatedAt: before.updatedAt }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) } })
      : await tx.blogPost.create({ data: { ...data, createdById: actor.actorId } });
    await recordSave(tx, before, post, actor, input.comment);
    const revision = await tx.blogRevision.findFirstOrThrow({ where: { postId: post.id }, orderBy: { number: "desc" }, select: { number: true } });
    return { post, version: revision.number, editorialChanged: !before || post.contentUpdatedAt?.getTime() !== (before.contentUpdatedAt ?? before.updatedAt).getTime() };
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
    const data = Object.fromEntries(articleFields.map(key => [key, snapshot[key] ?? null])) as Prisma.BlogPostUncheckedUpdateInput;
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
