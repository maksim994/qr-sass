import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { BlogEditorError, blogEditorSchema } from "@/lib/blog-editor";
import { saveArticle } from "@/lib/blog-workflow";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const posts = await getDb().blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, format: true, excerpt: true, authorName: true, readingTimeMinutes: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true, updatedAt: true, contentUpdatedAt: true },
  });
  return apiSuccess(posts);
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const parsed = blogEditorSchema.safeParse(await readJsonBody<unknown>(req));
  if (!parsed.success) return apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
  try {
    const post = await saveArticle(parsed.data, { actorId: admin.id, actorName: admin.email, source: "admin" });
    if (post.publishedAt) await notifyArticleIndexNow(post.slug);
    return apiSuccess(post);
  } catch (error) {
    if (error instanceof BlogEditorError) return apiError(error.message, "VALIDATION_ERROR", error.status, undefined, requestId);
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return apiError(MSG.POST_SLUG_EXISTS, "CONFLICT", 409, undefined, requestId);
    return apiError(MSG.BLOG_SAVE_FAILED, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
