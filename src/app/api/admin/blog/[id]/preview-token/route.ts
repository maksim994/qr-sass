import { getAdminOrNull } from "@/lib/admin-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { changePreviewToken } from "@/lib/blog-workflow";
import { BlogEditorError } from "@/lib/blog-editor";
import { MSG } from "@/lib/user-messages";
async function change(params: Promise<{ id: string }>, revoke: boolean) {
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  try {
    const path = await changePreviewToken((await params).id, { actorId: admin.id, actorName: admin.email, source: "admin" }, revoke);
    const response = apiSuccess({ path });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof BlogEditorError) return apiError(error.message, "NOT_FOUND", error.status);
    return apiError(MSG.BLOG_PREVIEW_LINK_FAILED, "INTERNAL_ERROR", 500);
  }
}
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) { return change(params, false); }
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) { return change(params, true); }
