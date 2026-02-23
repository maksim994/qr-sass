import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { WorkspacePlan } from "@prisma/client";

const PLAN_IDS = ["FREE", "PRO", "BUSINESS"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{ plan: string }>(req);
  if (!data?.plan || !PLAN_IDS.includes(data.plan as (typeof PLAN_IDS)[number])) {
    return apiError("Valid plan (FREE/PRO/BUSINESS) required.", "BAD_REQUEST", 400, undefined, requestId);
  }

  try {
    const db = getDb();
    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { plan: data.plan as WorkspacePlan },
    });
    return apiSuccess(workspace);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    if (msg.includes("Record to update not found") || msg.includes("record to update not found")) {
      return apiError("Workspace not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    return apiError(msg, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
