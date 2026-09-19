import { z } from "zod";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";

const renameSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const requestId = getRequestId(request);
  const { workspaceId } = await params;
  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  const parsed = renameSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.WORKSPACE_NAME_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
  const workspace = await getDb().workspace.update({
    where: { id: membership.workspaceId },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  return apiSuccess(workspace, 200, requestId);
}
