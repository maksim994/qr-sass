import { isComplimentary } from "@/lib/workspace-plan";
import { z } from "zod";
import { MSG } from "@/lib/user-messages";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordBusinessEvent } from "@/lib/business-events";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  const input = z
    .object({ workspaceId: z.string().min(1), useCurrentTerms: z.boolean().optional() })
    .safeParse(await readJsonBody(req));
  if (!input.success)
    return apiError(MSG.WORKSPACE_ID_REQUIRED, "VALIDATION_ERROR", 400);
  const workspaceId = input.data.workspaceId;
  try {
    const error = await getDb().$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: {
          userId: session.sub,
          workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });
      if (!membership) return "forbidden";
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const workspace = await tx.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        include: { subscription: true },
      });
      if (isComplimentary(workspace) || (workspace.accessMode === "archive" && !input.data.useCurrentTerms)) return "active";
      if (workspace.trialUsedAt) return "used";
      const now = new Date(),
        sub = workspace.subscription;
      if (
        sub &&
        sub.plan !== "FREE" &&
        sub.currentPeriodEnd > now &&
        ["active", "trial", "canceled"].includes(sub.status)
      )
        return "active";
      const trialEnd = new Date(now.getTime() + 14 * 86400000);
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { plan: "PRO", trialUsedAt: now, accessMode: "standard" },
      });
      await tx.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: "PRO",
          status: "trial",
          currentPeriodEnd: trialEnd,
        },
        update: {
          plan: "PRO",
          status: "trial",
          currentPeriodEnd: trialEnd,
          cancelAtPeriodEnd: false,
        },
      });
      await recordBusinessEvent(tx, {
        key: `trial:${workspaceId}`,
        name: "trial_started",
        workspaceId,
        userId: session.sub,
        isTest: process.env.NODE_ENV !== "production",
        payload: { plan: "PRO", periodEnd: trialEnd.toISOString() },
      });
      return null;
    });
    if (error === "forbidden") return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
    if (error)
      return apiError(
        error === "used" ? MSG.TRIAL_ALREADY_USED : MSG.TRIAL_ACTIVE_ACCESS,
        "CONFLICT",
        409,
      );
    return apiSuccess({ success: true, redirect: "/dashboard" });
  } catch {
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500);
  }
}
