import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { selectWorkspace } from "@/lib/workspace-select";
import { getBulkBatchLimit, getPlan } from "@/lib/plans";
import { getDb } from "@/lib/db";
import { BulkUploadClient } from "@/components/bulk-upload-client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert } from "@/components/ui";

function InlineCode({ children, sm }: { children: React.ReactNode; sm?: boolean }) {
  return <code className={`qrs-inline-code${sm ? " qrs-inline-code--sm" : ""}`}>{children}</code>;
}

export default async function BulkPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const [plan, totalQr] = await Promise.all([
    getPlan(workspace.plan),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
  ]);
  const bulkLimit = getBulkBatchLimit(plan.id);
  const qrRemaining = plan.limits.maxQrCodes == null ? null : Math.max(0, plan.limits.maxQrCodes - totalQr);
  const dynamicBlocked = !plan.limits.allowsDynamic;

  return (
    <div className="qrs-bulk-page">
      <DashboardPageHeader
        title="Массовое создание QR"
        description={
          <>
            Загрузите CSV или Excel с колонками <InlineCode>url</InlineCode>, <InlineCode>name</InlineCode>, UTM-параметры. Лимит партии:{" "}
            <b className="tnum" style={{ color: "var(--text-strong)" }}>{bulkLimit}</b>
            {qrRemaining != null ? (
              <>
                {" "}· осталось по тарифу: <b className="tnum" style={{ color: "var(--text-strong)" }}>{qrRemaining}</b>
              </>
            ) : null}
            .
          </>
        }
      />

      {dynamicBlocked ? (
        <div className="qrs-create-alerts">
          <Alert variant="warning" title="Нужен тариф Про">
            Массовое создание делает динамические QR. На бесплатном тарифе недоступно.{" "}
            <Link href="/dashboard/billing" className="qrs-navlink">
              Перейти на Про
            </Link>
          </Alert>
        </div>
      ) : qrRemaining === 0 ? (
        <div className="qrs-create-alerts">
          <Alert variant="warning" title="Лимит QR исчерпан">
            Удалите коды в библиотеке или{" "}
            <Link href="/dashboard/billing" className="qrs-navlink">
              обновите тариф
            </Link>
            .
          </Alert>
        </div>
      ) : (
        <BulkUploadClient workspaceId={workspace.id} bulkLimit={Math.min(bulkLimit, qrRemaining ?? bulkLimit)} />
      )}

      <div className="qrs-bulk-card">
        <div className="qrs-bulk-card-title qrs-bulk-card-title--spaced">Формат CSV</div>
        <pre className="qrs-bulk-pre">{`url,name,utm_source,utm_medium,utm_campaign
https://example.com,Кампания 1,campaign1,qr,summer`}</pre>
        <p className="qrs-bulk-format-text">
          Обязательная колонка — <InlineCode sm>url</InlineCode>. Опционально:{" "}
          <InlineCode sm>name</InlineCode>, <InlineCode sm>utm_source</InlineCode>, <InlineCode sm>utm_medium</InlineCode>,{" "}
          <InlineCode sm>utm_campaign</InlineCode>, <InlineCode sm>utm_term</InlineCode>, <InlineCode sm>utm_content</InlineCode>,{" "}
          <InlineCode sm>project_id</InlineCode>.
        </p>
      </div>
    </div>
  );
}
