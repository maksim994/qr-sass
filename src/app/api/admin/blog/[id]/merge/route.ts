import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { mergeArticles } from "@/lib/blog-merge";
import { MSG } from "@/lib/user-messages";
const input = z.object({ targetId: z.string().min(1).max(200), expectedUpdatedAt: z.iso.datetime({ offset: true }) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  const parsed = input.safeParse(await readJsonBody(request));
  if (!parsed.success) return privateApi(apiError(MSG.BLOG_MERGE_INVALID, "VALIDATION_ERROR", 400));
  try {
    const { id } = await params;
    return privateApi(apiSuccess(await mergeArticles(id, parsed.data.targetId, parsed.data.expectedUpdatedAt, { actorId: admin.id, actorName: admin.email, source: "admin" })));
  } catch (error) { return blogApiError(error); }
}
