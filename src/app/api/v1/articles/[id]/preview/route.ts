import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { blogEditorSchema, BlogEditorError } from "@/lib/blog-editor";
import { renderArticleBody } from "@/lib/blog-render";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { imageRemovalSchema } from "@/lib/blog-image-input";
import { prepareArticleImageRemoval } from "@/lib/blog-image-removal";

const previewSchema = blogEditorSchema.pick({ content: true, format: true, faq: true }).extend({ imageRemoval: imageRemovalSchema.optional() });
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await authenticateBlogApi(req);
    const { id } = await context.params;
    const parsed = previewSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) throw new BlogEditorError(MSG.BLOG_API_INPUT);
    const post = await getDb().blogPost.findUnique({ where: { id } });
    if (!post) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    const format = parsed.data.format ?? (post.format === "markdown" ? "markdown" : "html");
    const content = parsed.data.imageRemoval
      ? prepareArticleImageRemoval(parsed.data.content ?? post.content, parsed.data.imageRemoval, format, post.coverImageUrl).content
      : parsed.data.content ?? post.content;
    return privateApi(apiSuccess({ ...renderArticleBody(
      content,
      format,
      parsed.data.faq ?? post.faq,
    ), ...(parsed.data.imageRemoval ? { content } : {}) }));
  } catch (error) {
    return blogApiError(error);
  }
}
