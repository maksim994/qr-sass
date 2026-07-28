import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { expireTrialsIfNeeded } from "@/lib/trial-expire";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  await expireTrialsIfNeeded(workspace.id);

  const db = getDb();
  const [currentPlan, planFree, planPro, planBusiness, subscription] = await Promise.all([
    getPlan(workspace.plan ?? "FREE"),
    getPlan("FREE"),
    getPlan("PRO"),
    getPlan("BUSINESS"),
    db.subscription.findUnique({ where: { workspaceId: workspace.id } }),
  ]);

  const isTrial = subscription?.status === "trial";
  const periodEnd = subscription?.currentPeriodEnd;
  const isPaidPlan = workspace.plan === "PRO" || workspace.plan === "BUSINESS";
  const periodEndText =
    periodEnd && isPaidPlan
      ? isTrial
        ? `Пробный период до ${periodEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`
        : `Следующее списание — ${periodEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`
      : null;

  return (
    <div className="qrs-billing-page">
      <DashboardPageHeader
        title="Оплата и тарифы"
        description="Управляйте подпиской и способом оплаты."
      />

      <div className={`qrs-billing-banner${isPaidPlan ? "" : " qrs-billing-banner--free"}`}>
        <div>
          <div className="qrs-billing-banner-label">
            {isPaidPlan ? "Активная подписка" : "Текущий тариф"}
          </div>
          <div className="qrs-billing-banner-title">
            {isPaidPlan
              ? `${currentPlan.name} · ${currentPlan.priceRub.toLocaleString("ru-RU")} ₽/мес`
              : currentPlan.name}
          </div>
          {isPaidPlan && periodEndText ? (
            <div className="qrs-billing-banner-meta">{periodEndText}</div>
          ) : (
            <div className="qrs-billing-banner-meta">До 10 статических QR, экспорт PNG и SVG.</div>
          )}
        </div>
        <a href="#plans" className="qrs-billing-banner-action">
          {isPaidPlan ? "Управлять" : "Сменить тариф"}
        </a>
      </div>

      <BillingClient
        workspaceId={workspace.id}
        currentPlanId={workspace.plan ?? "FREE"}
        plans={[planFree, planPro, planBusiness]}
        trialUsedAt={!!workspace.trialUsedAt}
      />
    </div>
  );
}
