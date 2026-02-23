import { getDb } from "@/lib/db";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const { workspaceId, userId } = await params;
  const requestId = getRequestId(req);

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  if (userId === membership.userId) {
    return apiError("Нельзя исключить себя.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const toRemove = await getDb().membership.findFirst({
    where: { workspaceId, userId },
  });
  if (!toRemove) {
    return apiError("Участник не найден.", "NOT_FOUND", 404, undefined, requestId);
  }

  if (toRemove.role === "OWNER") {
    return apiError("Нельзя исключить владельца пространства.", "BAD_REQUEST", 400, undefined, requestId);
  }

  await getDb().membership.delete({
    where: { id: toRemove.id },
  });

  return apiSuccess({ removed: true });
}
