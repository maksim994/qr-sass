import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { selectWorkspace } from "@/lib/workspace-select";
import { getBulkBatchLimit } from "@/lib/plans";
import { getEntitlements } from "@/lib/entitlements";
import { getDb } from "@/lib/db";
import { BulkUploadClient } from "@/components/bulk-upload-client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert } from "@/components/ui";

export default async function BulkPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const [entitlements, totalQr] = await Promise.all([
    getEntitlements(workspace.id),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
  ]);
  const plan = entitlements.plan;
  const bulkLimit = getBulkBatchLimit(plan.id);
  const qrRemaining = plan.limits.maxQrCodes == null ? null : Math.max(0, plan.limits.maxQrCodes - totalQr);
  const dynamicBlocked = !plan.limits.allowsDynamic;

  return (
    <div className="qrs-bulk-page">
      <DashboardPageHeader
        title="Массовое создание QR"
        description="Создайте несколько динамических QR-кодов из таблицы и скачайте их одним ZIP-архивом."
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
      ) : (
        <BulkUploadClient workspaceId={workspace.id} bulkLimit={Math.min(bulkLimit, qrRemaining ?? bulkLimit)} />
      )}

    </div>
  );
}
