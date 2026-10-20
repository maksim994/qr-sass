import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { revokeBlogApiToken } from "@/lib/blog-api-tokens";
import { privateApi, blogApiError } from "@/lib/blog-api";
import { MSG } from "@/lib/user-messages";
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  try {
    await revokeBlogApiToken((await context.params).id, { actorId: admin.id, actorName: admin.email, source: "admin" });
    return privateApi(apiSuccess({ revoked: true }));
  } catch (error) { return blogApiError(error); }
}
