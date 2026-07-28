import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { contentTypeLabels } from "@/lib/qr-types";
import QrLibrary from "@/components/qr-library";
import { getPlan } from "@/lib/plans";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function LibraryPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const plan = await getPlan(workspace.plan);

  const qrCodes = await db.qrCode.findMany({
    where: { workspaceId: workspace.id, isArchived: false },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { scanEvents: true } } },
  });

  const items = qrCodes.map((qr) => ({
    id: qr.id,
    name: qr.name,
    kind: qr.kind,
    contentType: qr.contentType,
    createdAt: qr.createdAt.toISOString(),
    _count: qr._count,
  }));

  return (
    <div>
      <DashboardPageHeader
        title="Библиотека QR-кодов"
        description="Все QR-коды вашего пространства."
        action={
          <Link href="/dashboard/create" className="fk-button fk-button--primary">
            Создать QR-код
          </Link>
        }
      />

      <QrLibrary items={items} contentTypeLabels={contentTypeLabels} exportFormats={plan.limits.exportFormats} />
    </div>
  );
}
