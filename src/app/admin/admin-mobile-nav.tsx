"use client";

import Link from "next/link";
import { useState } from "react";

const navItems: Array<{ label: string; href: string; icon: string | string[] }> = [
  { label: "Обзор", href: "/admin", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { label: "Пользователи", href: "/admin/users", icon: ["M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0z", "M14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z", "M1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122z" ] },
  { label: "QR-коды", href: "/admin/qr", icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" },
  { label: "Тарифы", href: "/admin/plans", icon: "M2.25 18.75c0-2.485 2.099-4.5 4.688-4.5s4.688 2.015 4.688 4.5-2.099 4.5-4.688 4.5-4.688-2.015-4.688-4.5zM8.25 6.75c-1.624 0-2.906 1.297-2.906 2.938s1.282 2.938 2.906 2.938 2.906-1.297 2.906-2.938S9.874 6.75 8.25 6.75zM15.75 6.75c-1.624 0-2.906 1.297-2.906 2.938s1.282 2.938 2.906 2.938 2.906-1.297 2.906-2.938S17.374 6.75 15.75 6.75zM21.75 18.75c0-2.485-2.099-4.5-4.688-4.5s-4.688 2.015-4.688 4.5 2.099 4.5 4.688 4.5 4.688-2.015 4.688-4.5z" },
  { label: "Блог", href: "/admin/blog", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { label: "Администраторы", href: "/admin/admins", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
];

function IconSvg({ paths }: { paths: string[] }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      {paths.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Меню"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] border-l border-slate-200 bg-white shadow-xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
              <span className="font-semibold text-slate-900">Админ</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Закрыть"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 overflow-y-auto p-4">
              {navItems.map((item) => {
                const paths = Array.isArray(item.icon) ? item.icon : [item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <IconSvg paths={paths} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-slate-200 pt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <IconSvg paths={["M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"]} />
                  В дашборд
                </Link>
                <form action="/api/auth/logout" method="post" className="mt-1">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <IconSvg paths={["M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v4M12 15v3m0 3v.01M12 15l-3-3m0 0l3-3m-3 3h6"]} />
                    Выйти
                  </button>
                </form>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
