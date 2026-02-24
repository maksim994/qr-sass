import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { selectWorkspace } from "@/lib/workspace-select";
import { getPlan } from "@/lib/plans";
import { BulkUploadClient } from "@/components/bulk-upload-client";

const BULK_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 1000,
  BUSINESS: 5000,
};

export default async function BulkPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const plan = await getPlan(workspace.plan);
  const bulkLimit = BULK_LIMITS[plan.id] ?? 50;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/library"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        К библиотеке
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Массовое создание QR</h1>
      <p className="mt-2 text-slate-600">
        Загрузите CSV или Excel с колонками <code className="rounded bg-slate-100 px-1">url</code>,{" "}
        <code className="rounded bg-slate-100 px-1">name</code>, UTM-параметры. Лимит: {bulkLimit} за раз.
      </p>
      <div className="mt-6">
        <BulkUploadClient workspaceId={workspace.id} bulkLimit={bulkLimit} />
      </div>
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Формат CSV</h2>
        <pre className="mt-2 overflow-x-auto text-xs text-slate-600">
{`url,name,utm_source,utm_medium,utm_campaign
https://example.com,Кампания 1,campaign1,qr,summer`}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Обязательная колонка: url. Опционально: name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, project_id.
        </p>
      </div>
    </div>
  );
}
