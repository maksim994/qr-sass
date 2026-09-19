"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import s from "./site-header.module.css";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const navLinks = [
  { label: "Как работает", href: "/#how" },
  { label: "Меню", href: "/qr-menu" },
  { label: "Упаковка", href: "/qr-for-packaging" },
  { label: "Тарифы", href: "/#pricing" },
];

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
  minimal?: boolean;
};

export function SiteHeaderClient({ session, isAdmin, minimal = false }: Props) {
  const links = minimal ? [
    { label: "Возможности", href: "/#features" },
    { label: "Для кого", href: "/#use-cases" },
    { label: "Типы QR", href: "/#types" },
    { label: "Тарифы", href: "/#pricing" },
  ] : navLinks;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useFocusTrap(menuOpen, menuRef, closeMenu);

  return (
    <header
      className={minimal ? s.header : undefined}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: minimal ? "var(--surface-page)" : "color-mix(in srgb, var(--surface-page) 82%, transparent)",
        backdropFilter: minimal ? undefined : "saturate(180%) blur(14px)",
        WebkitBackdropFilter: minimal ? undefined : "saturate(180%) blur(14px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className={`fk-container ${minimal ? s.bar : ""}`}
        style={minimal ? undefined : { display: "flex", alignItems: "center", gap: "24px", height: "72px" }}
      >
        <Logo href="/" size="md" showTagline={!minimal} responsiveTagline className="mr-2 shrink-0" />

        <nav
          className={`qrs-desktop-nav ${minimal ? s.nav : ""}`}
          aria-label="Основная навигация"
          style={minimal ? undefined : { display: "flex", alignItems: "center", gap: "26px", marginLeft: "8px" }}
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="qrs-navlink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div
          className={`qrs-desktop-nav ${minimal ? s.actions : ""}`}
          style={minimal ? undefined : { marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}
        >
          <ThemeToggle />
          {session ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="qrs-navlink">
                  Админ
                </Link>
              )}
              <Button href="/dashboard" variant="primary" size="md">
                В кабинет
              </Button>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="qrs-navlink" style={{ background: "none", border: "none", cursor: "pointer" }}>
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="qrs-navlink">
                Войти
              </Link>
              <Button href="/#create-qr" variant="primary" size="md">
                Создать QR
              </Button>
            </>
          )}
        </div>

        {minimal && <div className={s.mobileTheme}><ThemeToggle /></div>}
        <button
          ref={buttonRef}
          type="button"
          className="qrs-menu-btn fk-icon-button fk-icon-button--outline"
          aria-label="Меню"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          style={{ marginLeft: "auto" }}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <line x1="4" x2="20" y1="7" y2="7" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="17" y2="17" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          ref={menuRef}
          id={menuId}
          className="qrs-mobile-nav"
          aria-label="Мобильная навигация"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "12px var(--gutter) 20px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--surface-page)",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "12px 8px",
                color: "var(--text-default)",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2.5 mt-2">
            {session ? (
              <>
                <Button href="/dashboard" variant="primary" size="md" block className="flex-1">
                  В кабинет
                </Button>
                <form action="/api/auth/logout" method="post" className="flex-1">
                  <Button type="submit" variant="secondary" size="md" block>
                    Выйти
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button href="/login" variant="secondary" size="md" block className="flex-1">
                  Войти
                </Button>
                <Button href="/#create-qr" variant="primary" size="md" block className="flex-1" onClick={() => setMenuOpen(false)}>
                  Создать QR
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
