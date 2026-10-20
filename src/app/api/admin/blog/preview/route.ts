import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { blogEditorSchema } from "@/lib/blog-editor";
import { renderArticleBody } from "@/lib/blog-render";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";
import { MSG } from "@/lib/user-messages";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const parsed = blogEditorSchema.pick({ content: true, format: true, faq: true, slug: true }).required({ content: true, format: true }).safeParse(await readJsonBody<unknown>(req));
  if (!parsed.success) return apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
  const { content, format, faq, slug } = parsed.data;
  const source = format === "html" ? sanitizeBlogFields({ slug, content }).content : content;
  const response = apiSuccess(renderArticleBody(source, format, faq));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
