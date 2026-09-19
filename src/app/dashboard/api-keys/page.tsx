import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import Link from "next/link";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ApiKeysClient, ApiKeysPermissionBanner, ApiKeysUpgradeBanner, ApiKeysWorkspaceBar } from "./api-keys-client";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const entitlements = await getEntitlements(workspace.id);
  const allowsApi = entitlements.allowsApi;

  const myMembership = user.memberships.find((m) => m.workspaceId === workspace.id);
  const canManageKeys = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";

  return (
    <div className="qrs-apikeys-page">
      <DashboardPageHeader
        title="API-ключи"
        description="Ключи для программного доступа к API. Доступны на тарифе Бизнес."
      />

      <div className="mb-6"><Link href="/dashboard/api-docs" className="fk-button fk-button--secondary">Открыть документацию API</Link></div>
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
