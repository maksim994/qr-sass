import { getDb } from "@/lib/db";
import { apiSuccess, apiError, readJsonBody } from "@/lib/api-response";
import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { articlePatchSchema, forbiddenApiPublication, articleApiView, blogApiError, privateApi } from "@/lib/blog-api";
import { saveArticleApi } from "@/lib/blog-workflow";
import { MSG } from "@/lib/user-messages";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  try {
    await authenticateBlogApi(req);
    const { id } = await context.params;
    const data = await getDb().$transaction(async tx => {
      const post = await tx.blogPost.findUnique({ where: { id } });
      if (!post) return null;
      const revision = await tx.blogRevision.findFirst({ where: { postId: id }, orderBy: { number: "desc" }, select: { number: true } });
      return articleApiView(post, revision?.number ?? 0);
    }, { isolationLevel: "RepeatableRead" });
    return privateApi(data ? apiSuccess(data) : apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404));
  } catch (error) { return blogApiError(error); }
}
export async function PATCH(req: Request, context: Context) {
  try {
    const auth = await authenticateBlogApi(req);
    const { id } = await context.params;
    const body = await readJsonBody(req);
    if (forbiddenApiPublication(body)) return privateApi(apiError(MSG.BLOG_API_FORBIDDEN, "FORBIDDEN", 403));
    const parsed = articlePatchSchema.safeParse(body);
    if (!parsed.success) return privateApi(apiError(MSG.BLOG_API_INPUT, "VALIDATION_ERROR", 400));
    const { version: expectedVersion, ...input } = parsed.data;
    const { post, version, editorialChanged } = await saveArticleApi(input, auth.actor, auth.tokenId, id, expectedVersion);
    if (post.publishedAt && editorialChanged) await notifyArticleIndexNow(post.slug);
    return privateApi(apiSuccess(articleApiView(post, version)));
  } catch (error) { return blogApiError(error); }
}
