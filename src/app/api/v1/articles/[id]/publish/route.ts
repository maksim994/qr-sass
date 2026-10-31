import { revalidatePath } from "next/cache";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { articleApiView, blogApiError, privateApi } from "@/lib/blog-api";
import { articlePublishSchema } from "@/lib/blog-api-input";
import { authenticateArticlePublication } from "@/lib/blog-api-publication";
import { publishArticleApi } from "@/lib/blog-workflow";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";
import { MSG } from "@/lib/user-messages";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    authenticateArticlePublication(req);
    const parsed = articlePublishSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) return privateApi(apiError(MSG.BLOG_API_PUBLISH_INPUT, "VALIDATION_ERROR", 400));
    const { id } = await context.params;
    const { post, version } = await publishArticleApi(id, parsed.data.version);
    for (const path of ["/", "/blog", `/blog/${post.slug}`, "/sitemap.xml"]) revalidatePath(path);
    await notifyArticleIndexNow(post.slug);
    return privateApi(apiSuccess(articleApiView(post, version)));
  } catch (error) { return blogApiError(error); }
}
