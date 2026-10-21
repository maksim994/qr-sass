import { getDb } from "@/lib/db";
import { BlogEditorError } from "@/lib/blog-editor";
import { lockEditorialRoutes } from "@/lib/editorial-redirects";
import { assertNoRedirectChain } from "@/lib/editorial-redirect-input";
import { recordSave, type BlogActor } from "@/lib/blog-versions";
import { MSG } from "@/lib/user-messages";

/** One admin transaction: unpublish the source and create a persistent 301, without changing either slug or media. */
export async function mergeArticles(id: string, targetId: string, expectedUpdatedAt: string, actor: BlogActor) {
  if (actor.source !== "admin") throw new BlogEditorError(MSG.BLOG_API_FORBIDDEN, 403);
  if (id === targetId) throw new BlogEditorError(MSG.BLOG_MERGE_INVALID);
  return getDb().$transaction(async tx => {
    await lockEditorialRoutes(tx);
    // Lock both articles in a stable order to serialize saves/publication and competing merges.
    await tx.$queryRaw`SELECT "id" FROM "BlogPost" WHERE "id" IN (${id}, ${targetId}) ORDER BY "id" FOR UPDATE`;
    const [before, target] = await Promise.all([
      tx.blogPost.findUnique({ where: { id } }), tx.blogPost.findUnique({ where: { id: targetId } }),
    ]);
    if (!before || !target) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    if (before.updatedAt.toISOString() !== expectedUpdatedAt) throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
    if (!before.publishedAt || !target.publishedAt) throw new BlogEditorError(MSG.BLOG_MERGE_INVALID);
    const source = `/blog/${before.slug}`, destination = `/blog/${target.slug}`;
    const rules = await tx.blogRedirect.findMany({ select: { source: true, target: true } });
    assertNoRedirectChain(source, destination, rules);
    const post = await tx.blogPost.update({ where: { id, updatedAt: before.updatedAt }, data: {
      status: "draft", publishedAt: null, scheduledAt: null,
      firstPublishedAt: before.firstPublishedAt ?? before.publishedAt,
      contentUpdatedAt: before.contentUpdatedAt ?? before.updatedAt,
    } });
    await recordSave(tx, before, post, actor, `Склейка с ${destination}`);
    const rule = await tx.blogRedirect.create({ data: { source, target: destination, comment: `Склейка статьи: ${before.title}`, actorName: actor.actorName } });
    await tx.blogEvent.create({ data: { postId: id, postTitle: before.title, ...actor, type: "redirect_create", fields: ["publishedAt", "status"], comment: `${source} → ${destination} · ${rule.id}` } });
    await tx.blogPendingRevision.deleteMany({ where: { postId: id } });
    await tx.blogPreviewToken.updateMany({ where: { postId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { source, target: destination, redirectId: rule.id };
  });
}
