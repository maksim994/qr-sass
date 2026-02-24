import Link from "next/link";
import { getDb } from "@/lib/db";

export default async function AdminOverviewPage() {
  const db = getDb();
  const [userCount, workspaceCount, qrCount, blogPostCount] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.qrCode.count({ where: { isArchived: false } }),
    db.blogPost.count(),
  ]);

  const stats = [
    {
      label: "Пользователей",
      value: userCount,
      href: "/admin/users",
      icon: "M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122z",
    },
    {
      label: "Рабочих пространств",
      value: workspaceCount,
      icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z",
    },
    {
      label: "QR-кодов",
      value: qrCount,
      href: "/admin/qr",
      icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z",
    },
    {
      label: "Статей блога",
      value: blogPostCount,
      href: "/admin/blog",
      icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Обзор</h1>
        <p className="mt-1 text-sm text-slate-500">Статистика системы. Нажмите на карточку для перехода в раздел.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const content = (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="card p-5 transition hover:shadow-lg">
              {content}
            </Link>
          ) : (
            <div key={stat.label} className="card p-5">
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/admin/users" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Пользователи</p>
            <p className="text-xs text-slate-500">Управление пользователями и тарифами</p>
          </div>
        </Link>
        <Link href="/admin/qr" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">QR-коды</p>
            <p className="text-xs text-slate-500">Все созданные QR-коды в системе</p>
          </div>
        </Link>
        <Link href="/admin/plans" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75c0-2.485 2.099-4.5 4.688-4.5s4.688 2.015 4.688 4.5-2.099 4.5-4.688 4.5-4.688-2.015-4.688-4.5zM8.25 6.75c-1.624 0-2.906 1.297-2.906 2.938s1.282 2.938 2.906 2.938 2.906-1.297 2.906-2.938S9.874 6.75 8.25 6.75z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Тарифы</p>
            <p className="text-xs text-slate-500">Параметры лимитов тарифных планов</p>
          </div>
        </Link>
        <Link href="/admin/blog" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h.75m-1.5 0h.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4.5h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Блог</p>
            <p className="text-xs text-slate-500">Статьи для SEO-продвижения</p>
          </div>
        </Link>
        <Link href="/admin/admins" className="card flex items-center gap-3 p-4 transition hover:shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Администраторы</p>
            <p className="text-xs text-slate-500">Управление правами администраторов</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
