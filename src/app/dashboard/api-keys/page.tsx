import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ApiKeysClient, ApiKeysPermissionBanner, ApiKeysUpgradeBanner, ApiKeysWorkspaceBar } from "./api-keys-client";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const planInfo = await getPlan(workspace.plan);
  const allowsApi = planInfo.id === "BUSINESS";

  const myMembership = user.memberships.find((m) => m.workspaceId === workspace.id);
  const canManageKeys = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";

  return (
    <div className="qrs-apikeys-page">
      <DashboardPageHeader
        title="API-ключи"
        description="Ключи для программного доступа к API. Доступны на тарифе Бизнес."
      />

      <ApiKeysWorkspaceBar workspaceId={workspace.id} />

      {!allowsApi ? (
        <ApiKeysUpgradeBanner />
      ) : !canManageKeys ? (
        <ApiKeysPermissionBanner />
      ) : (
        <ApiKeysClient workspaceId={workspace.id} />
      )}
    </div>
  );
}
