import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; inviteId: string }> },
) {
  const { workspaceId, inviteId } = await params;
  const requestId = getRequestId(req);
  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const changed = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    return tx.workspaceInvite.updateMany({
      where: { id: inviteId, workspaceId, status: "PENDING" },
      data: { status: "REVOKED", respondedAt: new Date() },
    });
  });
  if (changed.count !== 1) return apiError(MSG.INVITE_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  return apiSuccess({ revoked: true }, 200, requestId);
}
