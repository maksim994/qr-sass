import { getAdminOrNull } from "@/lib/admin-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { previewPendingRevision } from "@/lib/blog-pending-revision";
import { MSG } from "@/lib/user-messages";
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
    return privateApi(apiSuccess(await previewPendingRevision((await context.params).id, { actorId: admin.id, actorName: admin.email, source: "admin" })));
  } catch (error) { return blogApiError(error); }
}
