import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { calculateReadingTimeMinutes } from "@/lib/reading-time";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    title?: string;
    slug?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    excerpt?: string | null;
    content?: string;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
  }>(req);
  if (!data) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);

  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return apiError("Post not found.", "NOT_FOUND", 404, undefined, requestId);

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.metaTitle !== undefined) update.metaTitle = data.metaTitle?.trim() || null;
  if (data.metaDescription !== undefined) update.metaDescription = data.metaDescription?.trim() || null;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt?.trim() ?? null;
  if (data.content !== undefined) {
    update.content = String(data.content);
    update.readingTimeMinutes = calculateReadingTimeMinutes(String(data.content));
  }
  if (data.coverImageUrl !== undefined) update.coverImageUrl = data.coverImageUrl?.trim() || null;
  if (data.publishedAt !== undefined) update.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

  if (data.slug !== undefined) {
    const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug) return apiError("Invalid slug.", "VALIDATION_ERROR", 400, undefined, requestId);
    const conflict = await db.blogPost.findFirst({ where: { slug, id: { not: id } } });
    if (conflict) return apiError("Post with this slug already exists.", "CONFLICT", 409, undefined, requestId);
    update.slug = slug;
  }

  const post = await db.blogPost.update({
    where: { id },
    data: update,
  });
  return apiSuccess(post);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return apiError("Post not found.", "NOT_FOUND", 404, undefined, requestId);

  await db.blogPost.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
