import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { blogEditorSchema, BlogEditorError } from "@/lib/blog-editor";
import { imageRemovalSchema } from "@/lib/blog-image-input";
import { prepareArticleImageRemoval } from "@/lib/blog-image-removal";
import { renderArticleBody } from "@/lib/blog-render";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";
import { MSG } from "@/lib/user-messages";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const parsed = blogEditorSchema.pick({ content: true, format: true, faq: true, slug: true, coverImageUrl: true }).required({ content: true, format: true }).extend({ imageRemoval: imageRemovalSchema.optional() }).safeParse(await readJsonBody<unknown>(req));
  if (!parsed.success) return apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
  const { format, faq, slug, imageRemoval, coverImageUrl } = parsed.data;
  let content = parsed.data.content;
  if (imageRemoval) {
    try { content = prepareArticleImageRemoval(content, imageRemoval, format, coverImageUrl).content; }
    catch (error) {
      if (error instanceof BlogEditorError) return apiError(error.message, error.status === 409 ? "CONFLICT" : error.status === 404 ? "NOT_FOUND" : "VALIDATION_ERROR", error.status, error.details, requestId);
      throw error;
    }
  }
  const source = format === "html" ? sanitizeBlogFields({ slug, content }).content : content;
  const response = apiSuccess({ ...renderArticleBody(source, format, faq), ...(imageRemoval ? { content } : {}) });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
