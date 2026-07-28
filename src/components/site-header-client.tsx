"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { label: "Возможности", href: "/#features" },
  { label: "Типы кодов", href: "/#types" },
  { label: "Тарифы", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Блог", href: "/blog" },
];

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
};

export function SiteHeaderClient({ session, isAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: "color-mix(in srgb, var(--surface-page) 82%, transparent)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="fk-container"
        style={{ display: "flex", alignItems: "center", gap: "24px", height: "72px" }}
      >
        <Logo href="/" size="md" responsiveTagline className="mr-2 shrink-0" />

        <nav
          className="qrs-desktop-nav"
          aria-label="Основная навигация"
          style={{ display: "flex", alignItems: "center", gap: "26px", marginLeft: "8px" }}
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="qrs-navlink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div
          className="qrs-desktop-nav"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}
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
              <Button href="/dashboard" variant="primary" size="md">
                В кабинет
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="qrs-menu-btn fk-icon-button fk-icon-button--outline"
          aria-label="Меню"
          aria-expanded={menuOpen}
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
          {navLinks.map((link) => (
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
                <Button href="/register" variant="primary" size="md" block className="flex-1">
                  Начать бесплатно
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
