import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const planInfo = await getPlan(workspace.plan);
  const allowsApi = planInfo.id === "BUSINESS";

  const myMembership = user.memberships.find((m) => m.workspaceId === workspace.id);
  const canManageKeys = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">API-ключи</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ключи для программного доступа к API. Доступны на тарифе Бизнес.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <span className="font-medium text-slate-700">Workspace ID для API:</span>{" "}
        <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-slate-800">{workspace.id}</code>
      </div>

      {!allowsApi ? (
        <div className="card p-8 text-center">
          <p className="text-slate-600">API-доступ доступен на тарифе <strong>Бизнес</strong>.</p>
          <a href="/#pricing" className="btn btn-primary btn-sm mt-4">
            Перейти на Бизнес
          </a>
        </div>
      ) : !canManageKeys ? (
        <div className="card p-8 text-center">
          <p className="text-slate-600">
            Только владелец или администратор рабочей области могут создавать API-ключи.
          </p>
        </div>
      ) : (
        <ApiKeysClient workspaceId={workspace.id} />
      )}
    </div>
  );
}
