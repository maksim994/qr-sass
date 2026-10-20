import type { BlogPost } from "@prisma/client";
import { BlogEditorError } from "@/lib/blog-editor";
import { BlogApiAuthError } from "@/lib/blog-api-tokens";
import { apiError } from "@/lib/api-response";
import { articleStatus } from "@/lib/blog-versions";
import { MSG } from "@/lib/user-messages";

export { articleCreateSchema, articlePatchSchema, articleListSchema, forbiddenApiPublication } from "@/lib/blog-api-input";
export function articleApiView(post: BlogPost, version: number) {
  return { ...post, status: articleStatus(post), version };
}
export function privateApi<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export function blogApiError(error: unknown) {
  if (error instanceof BlogApiAuthError) {
    const response = apiError(error.message, error.status === 429 ? "RATE_LIMITED" : error.status === 404 ? "NOT_FOUND" : "UNAUTHORIZED", error.status);
    if (error.status === 401) response.headers.set("WWW-Authenticate", 'Bearer realm="articles"');
    if (error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
    return privateApi(response);
  }
  if (error instanceof BlogEditorError) return privateApi(apiError(error.message, error.status === 409 ? "CONFLICT" : error.status === 403 ? "FORBIDDEN" : error.status === 404 ? "NOT_FOUND" : "VALIDATION_ERROR", error.status));
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002") return privateApi(apiError(MSG.POST_SLUG_EXISTS, "CONFLICT", 409));
    if (error.code === "P2025" || error.code === "P2034") return privateApi(apiError(MSG.BLOG_SAVE_CONFLICT, "CONFLICT", 409));
    if (error.code === "P2003") return privateApi(apiError(MSG.BLOG_API_INPUT, "VALIDATION_ERROR", 400));
  }
  return privateApi(apiError(MSG.BLOG_SAVE_FAILED, "INTERNAL_ERROR", 500));
}
