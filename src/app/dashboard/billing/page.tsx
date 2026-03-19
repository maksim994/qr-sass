import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { getPlan } from "@/lib/plans";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const currentPlan = await getPlan(workspace.plan ?? "FREE");

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
      </div>

      <BillingClient workspaceId={workspace.id} currentPlanId={workspace.plan ?? "FREE"} />
    </div>
  );
}
