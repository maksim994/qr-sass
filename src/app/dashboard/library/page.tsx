import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { contentTypeLabels } from "@/lib/qr-types";
import QrLibrary from "@/components/qr-library";
import { selectWorkspace } from "@/lib/workspace-select";

export default async function LibraryPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Библиотека QR-кодов
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Все QR-коды вашего пространства.
          </p>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          Создать QR-код
        </Link>
      </div>

      <QrLibrary items={items} contentTypeLabels={contentTypeLabels} />
    </div>
  );
}
