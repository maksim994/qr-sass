import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { selectWorkspace } from "@/lib/workspace-select";
import { WorkspaceSwitcher } from "./workspace-switcher";

const navItems: Array<{ label: string; href: string; icon: string | string[] }> = [
  {
    label: "Обзор",
    href: "/dashboard",
    icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    label: "Создать QR",
    href: "/dashboard/create",
    icon: "M12 4.5v15m7.5-7.5h-15",
  },
  {
    label: "Библиотека",
    href: "/dashboard/library",
    icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z",
  },
  {
    label: "Аналитика",
    href: "/dashboard/analytics",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    label: "Команда",
    href: "/dashboard/team",
    icon: [
      "M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0z",
      "M14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z",
      "M1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122z",
      "M17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z",
    ],
  },
  {
    label: "API-ключи",
    href: "/dashboard/api-keys",
    icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.874-.029-1.575-1.039-1.575-2.019V5.25m0 0h-3v3h3v-3zm0 0h-6v3h6v-3z",
  },
  {
    label: "API Docs",
    href: "/dashboard/api-docs",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);

  if (!workspace) {
    redirect("/register");
  }

  const planInfo = await getPlan(workspace.plan);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            qr-s.ru
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const paths = Array.isArray(item.icon) ? item.icon : [item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  {paths.map((d, i) => (
                    <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
                  ))}
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4 space-y-2">
          <WorkspaceSwitcher
            workspaces={user.memberships.map((m) => m.workspace)}
            currentId={workspace.id}
          />
          <p className="truncate px-3 text-xs text-blue-500">{user.email}</p>
          <p className="px-3 text-xs font-medium text-blue-600">{planInfo.name}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-[240px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-lg">
          {/* Mobile menu button */}
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
              qr-s.ru
            </Link>
          </div>

          {/* Mobile nav links */}
          <nav className="flex items-center gap-1 lg:hidden">
            {navItems.map((item) => {
              const paths = Array.isArray(item.icon) ? item.icon : [item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title={item.label}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    {paths.map((d, i) => (
                      <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
                    ))}
                  </svg>
                </Link>
              );
            })}
          </nav>

          {/* Desktop left: workspace badge */}
          <div className="hidden items-center gap-3 lg:flex">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {workspace.name}
            </span>
          </div>

          {/* Right: user + logout */}
          <div className="flex items-center gap-4">
            {user.isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Админ
              </Link>
            )}
            <span className="hidden text-sm text-slate-500 md:block">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="btn btn-ghost btn-sm">Выйти</button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
