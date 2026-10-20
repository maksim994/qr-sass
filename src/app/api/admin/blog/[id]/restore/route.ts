import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiSuccess, apiError, readJsonBody } from "@/lib/api-response";
import { restoreArticle } from "@/lib/blog-workflow";
import { BlogEditorError } from "@/lib/blog-editor";
import { MSG } from "@/lib/user-messages";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  const parsed = z.object({ revisionId: z.string().min(1), expectedUpdatedAt: z.iso.datetime({ offset: true }) }).strict().safeParse(await readJsonBody(req));
  if (!parsed.success) return apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400);
  try {
    const post = await restoreArticle((await params).id, parsed.data.revisionId, parsed.data.expectedUpdatedAt, { actorId: admin.id, actorName: admin.email, source: "admin" });
    if (post.publishedAt) await notifyArticleIndexNow(post.slug);
    return apiSuccess({ id: post.id });
  } catch (error) {
    if (error instanceof BlogEditorError) return apiError(error.message, "VALIDATION_ERROR", error.status);
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return apiError(MSG.BLOG_SAVE_CONFLICT, "CONFLICT", 409);
    return apiError(MSG.BLOG_RESTORE_FAILED, "INTERNAL_ERROR", 500);
  }
}
