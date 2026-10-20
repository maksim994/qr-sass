import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { BlogEditorError, blogEditorSchema, prepareArticleSave } from "@/lib/blog-editor";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const parsed = blogEditorSchema.safeParse(await readJsonBody<unknown>(req));
  if (!parsed.success) return apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  try {
    const data = prepareArticleSave(parsed.data, existing);
    const post = await db.blogPost.update({ where: { id, updatedAt: existing.updatedAt }, data });
    if (post.publishedAt && (!existing.publishedAt || post.contentUpdatedAt?.getTime() !== (existing.contentUpdatedAt ?? existing.updatedAt).getTime())) await notifyArticleIndexNow(post.slug);
    return apiSuccess(post);
  } catch (error) {
    if (error instanceof BlogEditorError) return apiError(error.message, "VALIDATION_ERROR", error.status, undefined, requestId);
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") return apiError(MSG.POST_SLUG_EXISTS, "CONFLICT", 409, undefined, requestId);
      if (error.code === "P2025") return apiError(MSG.BLOG_SAVE_CONFLICT, "CONFLICT", 409, undefined, requestId);
    }
    return apiError(MSG.BLOG_SAVE_FAILED, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  await db.blogPost.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
