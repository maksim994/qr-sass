import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNullFromSessionOrApiKey } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { calculateReadingTimeMinutes } from "@/lib/reading-time";
import { normalizeStructuredDataInput } from "@/lib/blog-structured-data";
import { publicSiteUrl } from "@/lib/public-url";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNullFromSessionOrApiKey();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    title?: string;
    slug?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    excerpt?: string | null;
    content?: string;
    coverImageUrl?: string | null;
    authorName?: string | null;
    structuredData?: unknown;
    readingTimeMinutes?: number | null;
    categoryId?: string | null;
    publishedAt?: string | null;
  }>(req);
  if (!data) return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);

  if (data.structuredData !== undefined) {
    const structured = normalizeStructuredDataInput(data.structuredData);
    if (!structured.ok) return apiError(structured.error, "VALIDATION_ERROR", 400, undefined, requestId);
  }

  if (data.readingTimeMinutes != null) {
    const rt = Number(data.readingTimeMinutes);
    if (!Number.isFinite(rt) || rt < 1 || rt > 999) {
      return apiError("readingTimeMinutes должен быть числом от 1 до 999", "VALIDATION_ERROR", 400, undefined, requestId);
    }
  }

  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.metaTitle !== undefined) update.metaTitle = data.metaTitle?.trim() || null;
  if (data.metaDescription !== undefined) update.metaDescription = data.metaDescription?.trim() || null;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt?.trim() ?? null;
  if (data.content !== undefined) {
    update.content = String(data.content);
    if (data.readingTimeMinutes === undefined) {
      update.readingTimeMinutes = calculateReadingTimeMinutes(String(data.content));
    }
  }
  if (data.coverImageUrl !== undefined) update.coverImageUrl = data.coverImageUrl?.trim() || null;
  if (data.authorName !== undefined) update.authorName = data.authorName?.trim() || null;
  if (data.categoryId !== undefined) update.categoryId = data.categoryId?.trim() || null;
  if (data.structuredData !== undefined) {
    const structured = normalizeStructuredDataInput(data.structuredData);
    update.structuredData = structured.ok && structured.data ? structured.data : null;
  }
  if (data.readingTimeMinutes !== undefined) {
    if (data.readingTimeMinutes != null) {
      update.readingTimeMinutes = Math.round(Number(data.readingTimeMinutes));
    } else {
      const contentForCalc = data.content !== undefined ? String(data.content) : existing.content;
      update.readingTimeMinutes = calculateReadingTimeMinutes(contentForCalc);
    }
  }
  if (data.publishedAt !== undefined) update.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

  if (data.slug !== undefined) {
    const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug) return apiError(MSG.INVALID_SLUG, "VALIDATION_ERROR", 400, undefined, requestId);
    const conflict = await db.blogPost.findFirst({ where: { slug, id: { not: id } } });
    if (conflict) return apiError(MSG.POST_SLUG_EXISTS, "CONFLICT", 409, undefined, requestId);
    update.slug = slug;
  }

  const clean = sanitizeBlogFields({
    slug: typeof update.slug === "string" ? update.slug : existing.slug,
    title: typeof update.title === "string" ? update.title : existing.title,
    excerpt: (update.excerpt !== undefined ? update.excerpt : existing.excerpt) as string | null,
    metaTitle: (update.metaTitle !== undefined ? update.metaTitle : existing.metaTitle) as string | null,
    metaDescription: (update.metaDescription !== undefined ? update.metaDescription : existing.metaDescription) as string | null,
    content: typeof update.content === "string" ? update.content : existing.content,
    structuredData: (update.structuredData !== undefined ? update.structuredData : existing.structuredData) as string | null,
  });
  if (data.title !== undefined) update.title = clean.title;
  if (data.excerpt !== undefined) update.excerpt = clean.excerpt;
  if (data.metaTitle !== undefined) update.metaTitle = clean.metaTitle;
  if (data.metaDescription !== undefined) update.metaDescription = clean.metaDescription;
  if (data.content !== undefined) {
    update.content = clean.content;
    if (data.readingTimeMinutes === undefined) {
      update.readingTimeMinutes = calculateReadingTimeMinutes(String(clean.content));
    }
  }
  if (data.structuredData !== undefined) update.structuredData = clean.structuredData;

  const post = await db.blogPost.update({
    where: { id },
    data: update,
  });

  if (post.publishedAt) {
    const settings = await db.siteSettings.findUnique({ where: { id: "default" } });
    if (settings?.indexNowKey) {
      const { notifyIndexNow } = await import("@/lib/indexnow");
      const url = publicSiteUrl(`/blog/${post.slug}`);
      await notifyIndexNow([url], settings.indexNowKey);
    }
  }

  return apiSuccess(post);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNullFromSessionOrApiKey();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return apiError(MSG.POST_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  await db.blogPost.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
