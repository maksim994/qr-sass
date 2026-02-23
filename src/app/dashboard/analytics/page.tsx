import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { selectWorkspace } from "@/lib/workspace-select";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

  const [totalScans, totalQr, recentScans] = await Promise.all([
    db.scanEvent.count({ where: { qrCode: { workspaceId: workspace.id } } }),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    db.scanEvent.findMany({
      where: { qrCode: { workspaceId: workspace.id } },
      orderBy: { scannedAt: "desc" },
      take: 20,
      include: { qrCode: { select: { name: true, contentType: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Аналитика</h1>
        <p className="mt-1 text-sm text-slate-500">Общая статистика сканирований ваших QR-кодов.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-3xl font-bold text-slate-900">{totalScans}</p>
          <p className="mt-1 text-sm text-slate-500">Всего сканирований</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-slate-900">{totalQr}</p>
          <p className="mt-1 text-sm text-slate-500">Активных QR-кодов</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Последние сканирования</h2>
        {recentScans.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-slate-500">Сканирований пока нет.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">QR-код</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Страна</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Устройство</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{scan.qrCode.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(scan.scannedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{scan.country || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{scan.deviceType || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
