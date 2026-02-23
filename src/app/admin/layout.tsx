import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const navItems = [
  { label: "Обзор", href: "/admin" },
  { label: "Пользователи", href: "/admin/users" },
  { label: "QR-коды", href: "/admin/qr" },
  { label: "Тарифы", href: "/admin/plans" },
  { label: "Блог", href: "/admin/blog" },
  { label: "Администраторы", href: "/admin/admins" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-lg font-bold text-slate-900">
              qr-s.ru Admin
            </Link>
            <nav className="flex flex-wrap gap-2 sm:gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← В дашборд
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
