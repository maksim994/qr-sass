import { randomBytes } from "node:crypto";
import type { BlogPendingRevision, BlogPost, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { BlogEditorError, prepareArticleSave } from "@/lib/blog-editor";
import { articleRevisionFields, articleRevisionSchema } from "@/lib/blog-api-input";
import { assertActiveBlogToken } from "@/lib/blog-api-tokens";
import { articleStatus, articleSnapshot, recordSave, type BlogActor } from "@/lib/blog-versions";
import { hashPreviewToken } from "@/lib/blog-workflow";
import { MSG } from "@/lib/user-messages";

export function pendingArticleView(post: BlogPost, revision: Pick<BlogPendingRevision, "snapshot">): BlogPost {
  // Render the reviewed snapshot even if the live article has since changed.
  const snapshot = revision.snapshot as Record<string, unknown>;
  const dates = Object.fromEntries(["publishedAt", "firstPublishedAt", "scheduledAt", "contentUpdatedAt"].map(key => [key, snapshot[key] ? new Date(String(snapshot[key])) : null]));
  return { ...post, ...snapshot, ...dates } as BlogPost;
}

async function lockArticle(tx: Prisma.TransactionClient, id: string) {
  // Serialize pending edits, preview rotation and publication without touching live dates.
  await tx.$queryRaw`SELECT "id" FROM "BlogPost" WHERE "id" = ${id} FOR UPDATE`;
  const post = await tx.blogPost.findUnique({ where: { id } });
  if (!post) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
  return post;
}
function assertPublished(post: BlogPost) {
  if (!post.publishedAt || articleStatus(post) !== "published") throw new BlogEditorError(MSG.BLOG_PENDING_PUBLISHED_ONLY, 409);
}
export function assertPendingUnchanged(post: Pick<BlogPost, "updatedAt">, pending: Pick<BlogPendingRevision, "id" | "baseUpdatedAt" | "updatedAt">, expected?: { id: string; updatedAt: string }) {
  if (post.updatedAt.getTime() !== pending.baseUpdatedAt.getTime() || (expected && (expected.id !== pending.id || expected.updatedAt !== pending.updatedAt.toISOString()))) {
    throw new BlogEditorError(MSG.BLOG_PENDING_CONFLICT, 409);
  }
}
async function pendingEvent(tx: Prisma.TransactionClient, post: BlogPost, actor: BlogActor, type: string) {
  await tx.blogEvent.create({ data: { postId: post.id, postTitle: post.title, ...actor, type, fields: [] } });
}
export async function savePendingRevision(id: string, body: unknown, actor: BlogActor, tokenId: string) {
  const parsed = articleRevisionSchema.safeParse(body);
  if (!parsed.success) throw new BlogEditorError(MSG.BLOG_API_INPUT);
  const { version, ...patch } = parsed.data;
  return getDb().$transaction(async tx => {
    await assertActiveBlogToken(tx, tokenId);
    const post = await lockArticle(tx, id);
    assertPublished(post);
    if (version !== undefined) {
      const latest = await tx.blogRevision.findFirst({ where: { postId: id }, orderBy: { number: "desc" }, select: { number: true } });
      if (version !== (latest?.number ?? 0)) throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
    }
    const before = await tx.blogPendingRevision.findUnique({ where: { postId: id } });
    if (before) assertPendingUnchanged(post, before);
    const input = { ...articleRevisionFields.parse(before?.input ?? {}), ...patch };
    const prepared = prepareArticleSave(input, post); // Same validation, renderer and conversion safeguards as PATCH.
    if (input.categoryId && !await tx.blogCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } })) throw new BlogEditorError(MSG.BLOG_API_INPUT);
    const data = { snapshot: articleSnapshot({ ...post, ...prepared }), input: input as Prisma.InputJsonObject, baseUpdatedAt: post.updatedAt, actorName: actor.actorName, updatedAt: new Date(Math.max(Date.now(), (before?.updatedAt.getTime() ?? 0) + 1)) };
    const pending = await tx.blogPendingRevision.upsert({ where: { postId: id }, create: { postId: id, ...data }, update: data });
    await pendingEvent(tx, post, actor, "pending_save");
    return pending;
  });
}
export async function getPendingRevision(id: string) {
  return getDb().$transaction(async tx => {
    if (!await tx.blogPost.findUnique({ where: { id }, select: { id: true } })) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    const pending = await tx.blogPendingRevision.findUnique({ where: { postId: id } });
    if (!pending) throw new BlogEditorError(MSG.BLOG_PENDING_NOT_FOUND, 404);
    return pending;
  }, { isolationLevel: "RepeatableRead" });
}
export async function deletePendingRevision(id: string, actor: BlogActor, options: { tokenId?: string; expected?: { id: string; updatedAt: string } } = {}) {
  return getDb().$transaction(async tx => {
    if (options.tokenId) await assertActiveBlogToken(tx, options.tokenId);
    const post = await lockArticle(tx, id);
    const pending = await tx.blogPendingRevision.findUnique({ where: { postId: id } });
    if (!pending) throw new BlogEditorError(MSG.BLOG_PENDING_NOT_FOUND, 404);
    // Cancellation must also work for a draft made stale by a live save/unpublish.
    if (options.expected && (options.expected.id !== pending.id || options.expected.updatedAt !== pending.updatedAt.toISOString())) throw new BlogEditorError(MSG.BLOG_PENDING_CONFLICT, 409);
    await tx.blogPendingRevision.delete({ where: { id: pending.id } });
    await pendingEvent(tx, post, actor, "pending_cancel");
    return { id };
  });
}
export async function previewPendingRevision(id: string, actor: BlogActor, tokenId?: string) {
  const token = randomBytes(32).toString("base64url");
  await getDb().$transaction(async tx => {
    if (tokenId) await assertActiveBlogToken(tx, tokenId);
    const post = await lockArticle(tx, id);
    const pending = await tx.blogPendingRevision.findUnique({ where: { postId: id } });
    if (!pending) throw new BlogEditorError(MSG.BLOG_PENDING_NOT_FOUND, 404);
    await tx.blogPreviewToken.updateMany({ where: { pendingRevisionId: pending.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.blogPreviewToken.create({ data: { postId: id, pendingRevisionId: pending.id, hash: hashPreviewToken(token) } });
    await pendingEvent(tx, post, actor, "pending_preview");
  });
  return { path: `/preview/${token}` };
}
export async function publishPendingRevision(id: string, expected: { id: string; updatedAt: string }, actor: BlogActor) {
  if (actor.source !== "admin") throw new BlogEditorError(MSG.BLOG_API_FORBIDDEN, 403);
  return getDb().$transaction(async tx => {
    const before = await lockArticle(tx, id);
    assertPublished(before);
    const pending = await tx.blogPendingRevision.findUnique({ where: { postId: id } });
    if (!pending) throw new BlogEditorError(MSG.BLOG_PENDING_NOT_FOUND, 404);
    assertPendingUnchanged(before, pending, expected);
    const input = articleRevisionFields.parse(pending.input);
    const now = new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1));
    const data = prepareArticleSave(input, before, now);
    const post = await tx.blogPost.update({ where: { id, updatedAt: before.updatedAt }, data: { ...data, slug: before.slug, publishedAt: before.publishedAt, firstPublishedAt: before.firstPublishedAt ?? before.publishedAt, contentUpdatedAt: now, updatedAt: now } });
    await recordSave(tx, before, post, actor, input.comment ?? `Опубликован черновик изменений · ${pending.actorName}`);
    // Cascades revoke every secret preview of this pending revision atomically.
    await tx.blogPendingRevision.delete({ where: { id: pending.id } });
    await pendingEvent(tx, post, actor, "pending_publish");
    return post;
  });
}
