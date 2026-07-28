import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNullFromSessionOrApiKey } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { calculateReadingTimeMinutes } from "@/lib/reading-time";
import { normalizeStructuredDataInput } from "@/lib/blog-structured-data";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNullFromSessionOrApiKey();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      authorName: true,
      readingTimeMinutes: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return apiSuccess(posts);
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNullFromSessionOrApiKey();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    title: string;
    slug: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    excerpt?: string | null;
    content: string;
    coverImageUrl?: string | null;
    authorName?: string | null;
    structuredData?: unknown;
    readingTimeMinutes?: number | null;
    categoryId?: string | null;
    publishedAt?: string | null;
  }>(req);
  if (!data) return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
  if (!data.title?.trim()) return apiError(MSG.TITLE_REQUIRED, "VALIDATION_ERROR", 400, undefined, requestId);
  if (!data.slug?.trim()) return apiError(MSG.SLUG_REQUIRED, "VALIDATION_ERROR", 400, undefined, requestId);
  if (data.content == null) return apiError(MSG.CONTENT_REQUIRED, "VALIDATION_ERROR", 400, undefined, requestId);

  const structured = normalizeStructuredDataInput(data.structuredData);
  if (!structured.ok) return apiError(structured.error, "VALIDATION_ERROR", 400, undefined, requestId);

  if (data.readingTimeMinutes != null) {
    const rt = Number(data.readingTimeMinutes);
    if (!Number.isFinite(rt) || rt < 1 || rt > 999) {
      return apiError("readingTimeMinutes должен быть числом от 1 до 999", "VALIDATION_ERROR", 400, undefined, requestId);
    }
  }

  const db = getDb();
  const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return apiError(MSG.INVALID_SLUG, "VALIDATION_ERROR", 400, undefined, requestId);

  const existing = await db.blogPost.findUnique({ where: { slug } });
  if (existing) return apiError(MSG.POST_SLUG_EXISTS, "CONFLICT", 409, undefined, requestId);

  const publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
  const content = String(data.content);
  const readingTimeMinutes =
    data.readingTimeMinutes != null
      ? Math.round(Number(data.readingTimeMinutes))
      : calculateReadingTimeMinutes(content);

  const post = await db.blogPost.create({
    data: {
      title: data.title.trim(),
      slug,
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      excerpt: data.excerpt?.trim() ?? null,
      content,
      coverImageUrl: data.coverImageUrl?.trim() || null,
      authorName: data.authorName?.trim() || null,
      structuredData: structured.data || null,
      readingTimeMinutes,
      categoryId: data.categoryId?.trim() || null,
      publishedAt,
      createdById: admin.id,
    },
  });

  if (publishedAt) {
    const base = (process.env.APP_URL ?? "https://qr-s.ru").replace(/\/$/, "");
    const settings = await db.siteSettings.findUnique({ where: { id: "default" } });
    if (settings?.indexNowKey) {
      const { notifyIndexNow } = await import("@/lib/indexnow");
      const url = `${base}/blog/${slug}`;
      await notifyIndexNow([url], settings.indexNowKey);
    }
  }

  return apiSuccess(post);
}
