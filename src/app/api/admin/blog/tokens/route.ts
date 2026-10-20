import { z } from "zod";
import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { createBlogApiToken, tokenPublicSelect } from "@/lib/blog-api-tokens";
import { privateApi, blogApiError } from "@/lib/blog-api";
import { MSG } from "@/lib/user-messages";
export async function GET() {
  if (!await getAdminOrNull()) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  return privateApi(apiSuccess(await getDb().blogApiToken.findMany({ select: tokenPublicSelect, orderBy: { createdAt: "desc" } })));
}
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  const parsed = z.object({ name: z.string().trim().min(1).max(100) }).strict().safeParse(await readJsonBody(req));
  if (!parsed.success) return privateApi(apiError(MSG.BLOG_API_TOKEN_NAME, "VALIDATION_ERROR", 400));
  try { return privateApi(apiSuccess(await createBlogApiToken(parsed.data.name, { actorId: admin.id, actorName: admin.email, source: "admin" }), 201)); }
  catch (error) { return blogApiError(error); }
}
