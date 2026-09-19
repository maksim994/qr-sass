import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { applyWorkspaceTerms, archivedPlanId, isComplimentary } from "@/lib/workspace-plan";
import { getEntitlements } from "@/lib/entitlements";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { BillingClient, type BillingPaymentRow } from "./billing-client";

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const entitlements = await getEntitlements(workspace.id);

  const db = getDb();
  const [planFree, planPro, planBusiness, payments, settings, qrCount, memberCount] = await Promise.all([
    getPlan("FREE"),
    getPlan("PRO"),
    getPlan("BUSINESS"),
    db.payment.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        amount: true,
        currency: true,
        planId: true,
        status: true,
        createdAt: true,
        description: true,
      },
    }),
    db.siteSettings.findUnique({
      where: { id: "default" },
      select: { contactEmail: true },
    }),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    db.membership.count({ where: { workspaceId: workspace.id } }),
  ]);

  const paymentRows: BillingPaymentRow[] = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    planId: payment.planId,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
    description: payment.description,
  }));

  const terms = await db.workspace.findUniqueOrThrow({ where: { id: workspace.id }, include: { subscription: true } });
  const archiveId = archivedPlanId(terms);
  const archivedOffer = archiveId ? applyWorkspaceTerms(terms, await getPlan(archiveId)) : null;
  const role = user.memberships.find(membership => membership.workspaceId === workspace.id)?.role;
  const canManageBilling = role === "OWNER" || role === "ADMIN";

  return (
    <div className="qrs-billing-page">
      <DashboardPageHeader
        title="Оплата и тарифы"
        description="Ваш тариф, доступные возможности и история платежей."
      />

      <BillingClient
        workspaceId={workspace.id}
        currentPlanId={entitlements.planId}
        currentPlan={entitlements.plan}
        archivedOffer={archivedOffer}
        complimentary={isComplimentary(terms)}
        isTrial={entitlements.isTrial}
        status={entitlements.status}
        periodEnd={entitlements.periodEnd?.toISOString() ?? null}
        canManageBilling={canManageBilling}
        usage={{ qrCount, memberCount }}
        plans={[planFree, planPro, planBusiness]}
        trialUsedAt={!!workspace.trialUsedAt}
        payments={paymentRows}
        supportEmail={settings?.contactEmail ?? null}
      />
    </div>
  );
}
