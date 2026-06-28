import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
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
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{ plan: string }>(req);
  if (!data?.plan || !PLAN_IDS.includes(data.plan as (typeof PLAN_IDS)[number])) {
    return apiError(MSG.VALID_PLAN_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);
  }

  try {
    const db = getDb();
    const newPlan = data.plan as WorkspacePlan;

    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { plan: newPlan },
    });

    if (newPlan === "PRO" || newPlan === "BUSINESS") {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await db.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: newPlan,
          status: "active",
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan: newPlan,
          status: "active",
          currentPeriodEnd: periodEnd,
        },
      });
    }

    return apiSuccess(workspace);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    if (msg.includes("Record to update not found") || msg.includes("record to update not found")) {
      return apiError(MSG.WORKSPACE_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }
    return apiError(msg, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
