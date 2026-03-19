import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{ currentPeriodEnd: string }>(req);
  if (!data?.currentPeriodEnd || typeof data.currentPeriodEnd !== "string") {
    return apiError("currentPeriodEnd (ISO date) required.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const parsed = new Date(data.currentPeriodEnd);
  if (Number.isNaN(parsed.getTime())) {
    return apiError("Invalid date format. Use ISO 8601 (e.g. 2026-04-15).", "BAD_REQUEST", 400, undefined, requestId);
  }

  try {
    const db = getDb();
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    if (!workspace) {
      return apiError("Workspace not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    if (workspace.plan === "FREE") {
      return apiError("Workspace is on FREE plan. Change plan first.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const subscription = await db.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        plan: workspace.plan,
        status: "active",
        currentPeriodEnd: parsed,
      },
      update: { currentPeriodEnd: parsed },
    });
    return apiSuccess(subscription);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return apiError(msg, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
