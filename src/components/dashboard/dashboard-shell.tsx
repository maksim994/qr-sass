"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { dashboardNavItems } from "@/lib/dashboard-nav";
import { WorkspaceSwitcher } from "@/app/dashboard/workspace-switcher";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMediaQuery } from "@/hooks/use-media-query";
import styles from "./dashboard-shell.module.css";

type Workspace = { id: string; name: string; plan: string; planName?: string };
type Props = {
  children: React.ReactNode;
  user: { email: string; isAdmin: boolean };
  workspace: Workspace;
  workspaces: Workspace[];
};

const navGroups = [
  { label: "Рабочее пространство", paths: ["/dashboard", "/dashboard/library", "/dashboard/analytics", "/dashboard/bulk"] },
  { label: "Управление", paths: ["/dashboard/team", "/dashboard/billing", "/dashboard/profile"] },
  { label: "Интеграции", paths: ["/dashboard/api-keys", "/dashboard/api-docs"] },
];

export function DashboardShell({ children, user, workspace, workspaces }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overlayNav = useMediaQuery("(max-width: 980px)");
  const sidebarRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();
  const contentId = useId();
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useFocusTrap(overlayNav && sidebarOpen, sidebarRef, closeSidebar);
  useEffect(() => {
    if (!overlayNav || !sidebarOpen) return;
    const hamburger = hamburgerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      hamburger?.focus();
    };
  }, [overlayNav, sidebarOpen]);
  const current = dashboardNavItems.find((item) => item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className={styles.shell}>
      <a href={`#${contentId}`} className={styles.skip}>К содержимому</a>
      {overlayNav && sidebarOpen && <div className={styles.scrim} onClick={closeSidebar} aria-hidden="true" />}
      <aside
        ref={sidebarRef}
        id={sidebarId}
        className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}
        inert={overlayNav && !sidebarOpen ? true : undefined}
        aria-hidden={overlayNav && !sidebarOpen ? true : undefined}
        tabIndex={overlayNav && sidebarOpen ? -1 : undefined}
        role={overlayNav && sidebarOpen ? "dialog" : undefined}
        aria-modal={overlayNav && sidebarOpen ? true : undefined}
        aria-label={overlayNav && sidebarOpen ? "Навигация кабинета" : undefined}
      >
        <div className={styles.brand}>
          <Logo href="/" size="sm" showTagline={false} />
          <button type="button" className={`fk-icon-button fk-icon-button--ghost ${styles.close}`} aria-label="Закрыть меню" onClick={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
        <div className={styles.workspace}>
          <span className={styles.workspaceAvatar} aria-hidden="true">{workspace.name.slice(0, 1).toUpperCase()}</span>
          <div className={styles.workspaceInfo}>
            <span title={workspace.name}>{workspace.name}</span>
            <Link href="/dashboard/billing" onClick={closeSidebar}>Тариф {workspace.planName ?? workspace.plan}</Link>
          </div>
        </div>
        <div className={styles.switcher}><WorkspaceSwitcher workspaces={workspaces} currentId={workspace.id} /></div>
        <Link href="/dashboard/create" onClick={closeSidebar} className={`fk-button fk-button--primary ${styles.create}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Создать QR-код
        </Link>
        <nav className={styles.navigation} aria-label="Разделы кабинета">
          {navGroups.map((group) => (
            <div key={group.label} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              {group.paths.map((href) => {
                const item = dashboardNavItems.find((entry) => entry.href === href)!;
                const active = current?.href === href || (href === "/dashboard/library" && pathname.startsWith("/dashboard/qr/"));
                return (
                  <Link key={href} href={href} className={styles.navLink} aria-current={active ? "page" : undefined} onClick={closeSidebar}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {(Array.isArray(item.icon) ? item.icon : [item.icon]).map((d, i) => <path key={i} d={d} />)}
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>
          <Link href="/dashboard/profile" onClick={closeSidebar}><strong>Мой аккаунт</strong><span title={user.email}>{user.email}</span></Link>
        </div>
      </aside>
      <div className={styles.mainColumn} inert={overlayNav && sidebarOpen ? true : undefined}>
        <header className={styles.topbar}>
          <button type="button" ref={hamburgerRef} className={`fk-icon-button fk-icon-button--outline ${styles.hamburger}`} aria-label="Меню" aria-expanded={sidebarOpen} aria-controls={sidebarId} onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className={styles.breadcrumb}><span>Кабинет</span><span aria-hidden="true">/</span><strong>{current?.label ?? "QR-код"}</strong></div>
          <div className={styles.topbarActions}>
            {user.isAdmin && <Link href="/admin" className={styles.admin}>Админ</Link>}
            <ThemeToggle className={styles.theme} />
            <form action="/api/auth/logout" method="post"><button type="submit" className={styles.logout}>Выйти</button></form>
          </div>
        </header>
        <main id={contentId} tabIndex={-1} className={styles.content}><div className={styles.inner}>{children}</div></main>
      </div>
    </div>
  );
}
