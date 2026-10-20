import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { deleteEditorialRedirect } from "@/lib/editorial-redirects";
import { MSG } from "@/lib/user-messages";
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminOrNull();
  if (!admin)
    return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  try {
    await deleteEditorialRedirect((await params).id, {
      actorId: admin.id,
      actorName: admin.email,
      source: "admin",
    });
    return privateApi(apiSuccess({ deleted: true }));
  } catch (error) {
    return blogApiError(error);
  }
}
