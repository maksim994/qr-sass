import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { prepareHtmlConversion } from "@/lib/blog-convert";
import { MSG } from "@/lib/user-messages";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(req);
  if (!await getAdminOrNull()) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const { id } = await params;
  const post = await getDb().blogPost.findUnique({ where: { id } });
  if (!post) return apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  if (post.format !== "html") return apiError(MSG.BLOG_FORMAT_LOCKED, "VALIDATION_ERROR", 400, undefined, requestId);
  // Read-only operation: conversion and the original HTML are persisted only by confirmed PATCH.
  const response = apiSuccess(prepareHtmlConversion(post.content, post.faq));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
