import { getDb } from "@/lib/db";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; keyId: string }> }
) {
  const { workspaceId, keyId } = await params;
  const requestId = getRequestId(req);

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const key = await getDb().apiKey.findFirst({
    where: { id: keyId, workspaceId },
  });
  if (!key) {
    return apiError("Ключ не найден.", "NOT_FOUND", 404, undefined, requestId);
  }

  await getDb().apiKey.delete({ where: { id: keyId } });
  return apiSuccess({ deleted: true });
}
