"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminNavItems } from "@/lib/admin-nav";

function NavIcon({ paths }: { paths: string[] }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

type Props = {
  children: React.ReactNode;
  user: {
    email: string;
  };
};

export function AdminShell({ children, user }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLink = (href: string, label: string, icon: string | string[]) => {
    const paths = Array.isArray(icon) ? icon : [icon];
    const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className="qrs-nav-item"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "13px",
          width: "100%",
          padding: "11px 13px",
          borderRadius: "8px",
          background: active ? "var(--color-primary-subtle)" : "transparent",
          color: active ? "var(--color-primary)" : "var(--text-default)",
          font: `${active ? "var(--fw-bold)" : "var(--fw-semibold)"} 14px/1.2 var(--font-sans)`,
          whiteSpace: "nowrap",
        }}
        aria-current={active ? "page" : undefined}
      >
        <NavIcon paths={paths} />
        {label}
      </Link>
    );
  };

  const sidebar = (
    <>
      <div className="qrs-dash-sidebar-head">
        <Logo href="/" size="sm" />
        <span className="fk-badge fk-badge--primary qrs-admin-badge">Admin</span>
      </div>
      <nav
        className="qrs-scroll"
        aria-label="Разделы админки"
        style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: "3px" }}
      >
        {adminNavItems.map((item) => navLink(item.href, item.label, item.icon))}
      </nav>
      <div className="border-t p-4" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="px-2.5">
          <Link href="/dashboard" className="qrs-dash-admin">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            В дашборд
          </Link>
        </div>
        <p className="mt-2 truncate px-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {user.email}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh" style={{ background: "var(--surface-subtle)", color: "var(--text-default)" }}>
      {sidebarOpen && (
        <div
          className="qrs-scrim fixed inset-0 z-[490]"
          style={{ background: "rgba(19,23,32,0.5)" }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`qrs-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          width: "260px",
          flex: "none",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-page)",
          borderRight: "1px solid var(--border-subtle)",
          boxShadow: sidebarOpen ? "var(--shadow-xl)" : undefined,
        }}
      >
        {sidebar}
      </aside>

      <div className="qrs-main flex min-w-0 flex-1 flex-col">
        <header className="qrs-dash-topbar">
          <div className="qrs-dash-topbar-start">
            <button
              type="button"
              className="qrs-hamb qrs-dash-hamb fk-icon-button fk-icon-button--outline"
              aria-label="Меню"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <line x1="4" x2="20" y1="7" y2="7" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="17" y2="17" />
              </svg>
            </button>

            <span className="qrs-dash-workspace">Админ-панель</span>
          </div>

          <div className="qrs-dash-topbar-end">
            <ThemeToggle className="qrs-dash-theme" />
            <Link href="/dashboard" className="qrs-topbar-meta qrs-dash-admin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Дашборд
            </Link>
            <span className="qrs-topbar-meta qrs-dash-email">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="qrs-dash-logout">
                Выйти
              </button>
            </form>
          </div>
        </header>

        <main className="qrs-scroll flex-1 overflow-y-auto" style={{ padding: "clamp(20px, 3vw, 40px)" }}>
          <div className="qrs-dash-main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
