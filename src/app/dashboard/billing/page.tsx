import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { expireTrialsIfNeeded } from "@/lib/trial-expire";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  await expireTrialsIfNeeded(workspace.id);

  const db = getDb();
  const [currentPlan, planPro, planBusiness, subscription] = await Promise.all([
    getPlan(workspace.plan ?? "FREE"),
    getPlan("PRO"),
    getPlan("BUSINESS"),
    db.subscription.findUnique({ where: { workspaceId: workspace.id } }),
  ]);

  const isTrial = subscription?.status === "trial";
  const periodEnd = subscription?.currentPeriodEnd;
  const periodEndText =
    periodEnd && (workspace.plan === "PRO" || workspace.plan === "BUSINESS")
      ? isTrial
        ? `Пробный период до ${periodEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`
        : `Оплачено до ${periodEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`
      : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Оплата и тарифы</h1>
        <p className="mt-1 text-sm text-slate-500">
          Управление подпиской для воркспейса "{workspace.name}".
        </p>
      </div>

      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900">Текущий тариф: {currentPlan.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{currentPlan.description}</p>
        {periodEndText && (
          <p className="mt-2 text-sm font-medium text-slate-700">{periodEndText}</p>
        )}
      </div>

      <BillingClient
        workspaceId={workspace.id}
        currentPlanId={workspace.plan ?? "FREE"}
        plans={[planPro, planBusiness]}
        trialUsedAt={!!workspace.trialUsedAt}
      />
    </div>
  );
}
