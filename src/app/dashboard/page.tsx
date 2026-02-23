import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan, formatUsage } from "@/lib/plans";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

  const [totalQr, recentQrs, scanCount7d] = await Promise.all([
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    db.qrCode.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { scanEvents: true } } },
    }),
    db.scanEvent.count({
      where: {
        qrCode: { workspaceId: workspace.id },
        scannedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const dynamicCount = await db.qrCode.count({
    where: { workspaceId: workspace.id, kind: "DYNAMIC", isArchived: false },
  });

  const memberCount = await db.membership.count({
    where: { workspaceId: workspace.id },
  });

  const planInfo = await getPlan(workspace.plan ?? "FREE");
  const qrLimit = planInfo.limits.maxQrCodes;
  const userLimit = planInfo.limits.maxUsers;

  const stats = [
    { label: "Всего QR-кодов", value: totalQr, icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" },
    { label: "Сканирований за 7 дней", value: scanCount7d, icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
    { label: "Динамических QR", value: dynamicCount, icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" },
  ];

  const contentTypeLabels: Record<string, string> = {
    URL: "Ссылка", TEXT: "Текст", EMAIL: "Email", PHONE: "Телефон", SMS: "SMS",
    WIFI: "Wi-Fi", VCARD: "Визитка", LOCATION: "Геолокация", PDF: "PDF",
    IMAGE: "Изображение", VIDEO: "Видео", MP3: "MP3", MENU: "Меню",
    BUSINESS: "Бизнес", LINK_LIST: "Список ссылок", COUPON: "Купон",
    APP_STORE: "Приложение", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
    WHATSAPP: "WhatsApp", SOCIAL_LINKS: "Соцсети",
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Обзор</h1>
          <p className="mt-1 text-sm text-slate-500">Статистика и последние QR-коды вашего пространства.</p>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          Создать QR-код
        </Link>
      </div>

      {/* Plan & limits */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Текущий тариф: {planInfo.name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                QR-кодов: {formatUsage(totalQr, qrLimit)}
                {qrLimit !== null && totalQr >= qrLimit && (
                  <span className="ml-1 text-amber-600">· лимит достигнут</span>
                )}
              </span>
              <span>
                Пользователей: {formatUsage(memberCount, userLimit)}
                {userLimit !== null && memberCount >= userLimit && (
                  <span className="ml-1 text-amber-600">· лимит достигнут</span>
                )}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <ul className="space-y-1 text-sm text-slate-500">
              {planInfo.limitLabels.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {planInfo.id === "FREE" && (
          <Link href="/#pricing" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Перейти на Про или Бизнес →
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent QR codes */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Последние QR-коды</h2>
          <Link href="/dashboard/library" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Смотреть все
          </Link>
        </div>
        {recentQrs.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">QR-коды ещё не созданы.</p>
            <Link href="/dashboard/create" className="btn btn-primary btn-sm mt-4">
              Создать первый QR
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentQrs.map((qr) => (
              <Link key={qr.id} href={`/dashboard/qr/${qr.id}`} className="card flex items-center justify-between p-4 transition hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{qr.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="badge">{contentTypeLabels[qr.contentType] || qr.contentType}</span>
                      <span className="text-xs text-slate-400">{qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{qr._count.scanEvents}</p>
                  <p className="text-xs text-slate-400">скан.</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
