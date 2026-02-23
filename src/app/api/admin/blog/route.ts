import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { calculateReadingTimeMinutes } from "@/lib/reading-time";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return apiSuccess(posts);
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    title: string;
    slug: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    excerpt?: string | null;
    content: string;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
  }>(req);
  if (!data) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
  if (!data.title?.trim()) return apiError("Title is required.", "VALIDATION_ERROR", 400, undefined, requestId);
  if (!data.slug?.trim()) return apiError("Slug is required.", "VALIDATION_ERROR", 400, undefined, requestId);
  if (data.content == null) return apiError("Content is required.", "VALIDATION_ERROR", 400, undefined, requestId);

  const db = getDb();
  const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return apiError("Invalid slug.", "VALIDATION_ERROR", 400, undefined, requestId);

  const existing = await db.blogPost.findUnique({ where: { slug } });
  if (existing) return apiError("Post with this slug already exists.", "CONFLICT", 409, undefined, requestId);

  const publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

  const readingTimeMinutes = calculateReadingTimeMinutes(String(data.content));
  const post = await db.blogPost.create({
    data: {
      title: data.title.trim(),
      slug,
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      excerpt: data.excerpt?.trim() ?? null,
      content: String(data.content),
      coverImageUrl: data.coverImageUrl?.trim() || null,
      readingTimeMinutes,
      publishedAt,
      createdById: admin.id,
    },
  });
  return apiSuccess(post);
}
