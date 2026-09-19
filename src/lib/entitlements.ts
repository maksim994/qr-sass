import { applyWorkspaceTerms } from "@/lib/workspace-plan";
import { WorkspacePlan } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getPlan, type PlanId, type PlanInfo } from "@/lib/plans";

export type EntitlementStatus = "free" | "trial" | "active" | "expired" | "canceled";

export type Entitlements = {
  workspaceId: string;
  planId: PlanId;
  status: EntitlementStatus;
  isTrial: boolean;
  periodEnd: Date | null;
  plan: PlanInfo;
  allowsDynamic: boolean;
  allowsAnalytics: boolean;
  allowsApi: boolean;
};

function asPlanId(value: string | null | undefined): PlanId {
  const id = String(value ?? "FREE").toUpperCase();
  return id === "PRO" || id === "BUSINESS" ? id : "FREE";
}

function rightsFrom(
  planId: PlanId,
  status: EntitlementStatus,
  isTrial: boolean,
  periodEnd: Date | null,
  plan: PlanInfo,
  workspaceId: string,
): Entitlements {
  return {
    workspaceId,
    planId,
    status,
    isTrial,
    periodEnd,
    plan,
    allowsDynamic: plan.limits.allowsDynamic,
    allowsAnalytics: plan.limits.allowsAnalytics,
    allowsApi: plan.id === "BUSINESS",
  };
}

function periodOpen(periodEnd: Date | null | undefined, now: Date): boolean {
  return Boolean(periodEnd && periodEnd.getTime() >= now.getTime());
}

/**
 * Single source of plan rights for UI and API.
 * Expiry writes FREE only after a fresh read (and a workspace lock when the
 * driver supports it) so a concurrent successful payment is not overwritten.
 */
export async function getEntitlements(workspaceId: string, now = new Date()): Promise<Entitlements> {
  const db = getDb();
  const freePlan = await getPlan("FREE");

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (!workspace) {
    return rightsFrom("FREE", "free", false, null, freePlan, workspaceId);
  }

  if (workspace.accessMode === "friends" || (workspace.accessMode === "archive" && !workspace.subscription)) {
    const plan = applyWorkspaceTerms(workspace, await getPlan(workspace.plan));
    return rightsFrom(plan.id, plan.id === "FREE" ? "free" : "active", false, null, plan, workspaceId);
  }
  const snapshot = workspace.subscription;
  if (snapshot && periodOpen(snapshot.currentPeriodEnd, now) && (snapshot.status === "trial" || snapshot.status === "active" || snapshot.status === "canceled")) {
    const planId = asPlanId(snapshot.plan);
    const plan = applyWorkspaceTerms(workspace, await getPlan(planId));
    const status: EntitlementStatus =
      snapshot.status === "trial" ? "trial" : snapshot.status === "canceled" ? "canceled" : "active";
    return rightsFrom(planId, status, snapshot.status === "trial", snapshot.currentPeriodEnd, plan, workspaceId);
  }

  if (snapshot && !periodOpen(snapshot.currentPeriodEnd, now)) {
    try {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
        const lockedWorkspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
        if (lockedWorkspace?.accessMode === "friends") return;
        const locked = await tx.subscription.findUnique({ where: { id: snapshot.id } });
        if (!locked || periodOpen(locked.currentPeriodEnd, now)) return;
        if (locked.status === "active" || locked.status === "trial") {
          /* still a live status with a closed period — expire only this row */
        }
        const nextStatus = locked.status === "canceled" ? "canceled" : "expired";
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { plan: WorkspacePlan.FREE },
        });
        await tx.subscription.update({
          where: { id: locked.id },
          data: { status: nextStatus },
        });
      });
    } catch {
      // Do not write outside the lock. Retryable failures are retried on the next read.
    }
  }

  const fresh = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { subscription: true },
  });
  if (fresh?.accessMode === "friends" || (fresh?.accessMode === "archive" && !fresh.subscription)) {
    const plan = applyWorkspaceTerms(fresh, await getPlan(fresh.plan));
    return rightsFrom(plan.id, plan.id === "FREE" ? "free" : "active", false, null, plan, workspaceId);
  }
  const sub = fresh?.subscription;
  const liveStatus = sub?.status === "trial" || sub?.status === "active" || sub?.status === "canceled";
  if (sub && liveStatus && periodOpen(sub.currentPeriodEnd, now)) {
    const planId = asPlanId(sub.plan);
    const plan = applyWorkspaceTerms(fresh ?? {}, await getPlan(planId));
    const status: EntitlementStatus =
      sub.status === "trial" ? "trial" : sub.status === "canceled" ? "canceled" : "active";
    return rightsFrom(planId, status, sub.status === "trial", sub.currentPeriodEnd, plan, workspaceId);
  }

  const plan = applyWorkspaceTerms(fresh ?? {}, await getPlan("FREE"));
  const status: EntitlementStatus = sub?.status === "canceled" ? "canceled" : sub ? "expired" : "free";
  return rightsFrom("FREE", status, false, sub?.currentPeriodEnd ?? null, plan, workspaceId);
}

export async function assertAllowsDynamic(workspaceId: string) {
  const entitlements = await getEntitlements(workspaceId);
  return entitlements.allowsDynamic
    ? ({ ok: true as const, entitlements })
    : ({ ok: false as const, entitlements });
}
