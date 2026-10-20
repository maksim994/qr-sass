import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { apiSuccess, apiError, readJsonBody } from "@/lib/api-response";
import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { articleCreateSchema, articleListSchema, articleApiView, blogApiError, privateApi } from "@/lib/blog-api";
import { saveArticleApi } from "@/lib/blog-workflow";
import { MSG } from "@/lib/user-messages";

export async function GET(req: Request) {
  try {
    await authenticateBlogApi(req);
    const query = articleListSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!query.success) return privateApi(apiError(MSG.BLOG_API_INPUT, "VALIDATION_ERROR", 400));
    const { status, slug, page, limit } = query.data;
    const where: Prisma.BlogPostWhereInput = { ...(slug ? { slug } : {}), ...(status === "published" ? { publishedAt: { not: null } } : status === "draft" ? { publishedAt: null, OR: [{ status: null }, { status: "draft" }] } : status === "scheduled" ? { status } : {}) };
    const data = await getDb().$transaction(async tx => {
      const total = await tx.blogPost.count({ where });
      const posts = await tx.blogPost.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit });
      const items = await Promise.all(posts.map(async post => {
        const latest = await tx.blogRevision.findFirst({ where: { postId: post.id }, orderBy: { number: "desc" }, select: { number: true } });
        const { id, slug, title, status, format, excerpt, updatedAt, contentUpdatedAt, createdAt, publishedAt, scheduledAt, version } = articleApiView(post, latest?.number ?? 0);
        return { id, slug, title, status, format, excerpt, updatedAt, contentUpdatedAt, createdAt, publishedAt, scheduledAt, version };
      }));
      return { items, total, page, limit };
    }, { isolationLevel: "RepeatableRead" });
    return privateApi(apiSuccess(data));
  } catch (error) { return blogApiError(error); }
}
export async function POST(req: Request) {
  try {
    const auth = await authenticateBlogApi(req);
    const parsed = articleCreateSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) return privateApi(apiError(MSG.BLOG_API_INPUT, "VALIDATION_ERROR", 400));
    // status is accepted for compatibility but can never grant publication rights.
    const { status: ignored, ...input } = parsed.data;
    void ignored;
    const { post, version } = await saveArticleApi({ ...input, status: "draft" }, auth.actor, auth.tokenId);
    return privateApi(apiSuccess(articleApiView(post, version), 201));
  } catch (error) { return blogApiError(error); }
}
