"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import styles from "./auth-shell.module.css";
import { Button } from "@/components/ui/button";

export type AuthMode = "login" | "register" | "forgot";

type AuthShellProps = {
  mode: AuthMode;
  title: string;
  subtitle: string;
  children: ReactNode;
  planName?: string;
  planFeatures?: string[];
  nextPath?: string;
};

function hrefWithNext(path: string, nextPath?: string) {
  if (!nextPath || nextPath === "/dashboard") return path;
  const url = new URL(path, "https://qr-s.invalid");
  url.searchParams.set("next", nextPath);
  return `${url.pathname}${url.search}`;
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function AuthDivider() {
  return (
    <div className="qrs-auth-divider" aria-hidden="true">
      <span>или</span>
    </div>
  );
}

export function YandexAuthButton({ mode, nextPath }: { mode: AuthMode; nextPath?: string }) {
  const label = mode === "login" ? "Войти через Яндекс" : "Зарегистрироваться через Яндекс";

  return (
    <Button href={hrefWithNext("/api/auth/yandex", nextPath)} variant="secondary" block className="qrs-auth-yandex">
      <span className="qrs-auth-yandex__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
          <path
            d="M13.32 7.67h-.95c-1.88 0-2.87.9-2.87 2.45 0 1.17.56 1.82 1.62 2.55l.9.6-2.58 3.73H9.1l2.22-3.28c-1.36-.98-2.12-2.02-2.12-3.58 0-2.2 1.54-3.47 4.12-3.47h1.9v12.33h-1.92V7.67Z"
            fill="#fff"
          />
        </svg>
      </span>
      {label}
    </Button>
  );
}

export function AuthSwitchLink({ mode, nextPath }: { mode: AuthMode; nextPath?: string }) {
  if (mode === "forgot") {
    return <p className="qrs-auth-switch"><Link href={hrefWithNext("/login", nextPath)} className="qrs-auth-switch__link">Вернуться ко входу</Link></p>;
  }
  if (mode === "login") {
    return (
      <p className="qrs-auth-switch">
        Ещё нет аккаунта?{" "}
        <Link href={hrefWithNext("/register", nextPath)} className="qrs-auth-switch__link">
          Зарегистрируйтесь
        </Link>
      </p>
    );
  }

  return (
    <p className="qrs-auth-switch">
      Уже есть аккаунт?{" "}
      <Link href={hrefWithNext("/login", nextPath)} className="qrs-auth-switch__link">
        Войти
      </Link>
    </p>
  );
}

export function AuthLegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="qrs-auth-legal">
      <span>© {year} QR-S.ru</span>
      <span className="qrs-auth-legal__sep" aria-hidden="true">
        ·
      </span>
      <Link href="/privacy-policy">Конфиденциальность</Link>
      <span className="qrs-auth-legal__sep" aria-hidden="true">
        ·
      </span>
      <Link href="/terms-of-service">Условия</Link>
    </footer>
  );
}

export function AuthShell({
  mode,
  title,
  subtitle,
  children,
  planName,
  planFeatures,
}: AuthShellProps) {
  const promoFeatures = mode === "register" && planFeatures?.length
    ? planFeatures
    : ["Ссылки, файлы и контакты в QR", "Оформление под ваш бренд", "Все ваши коды в одном кабинете"];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo href="/" size="md" showTagline={false} />
        <div><Link href="/" className={styles.homeLink}><span aria-hidden="true">←</span> На главную</Link><ThemeToggle /></div>
      </header>
      <main className={styles.layout}>
        <div className={styles.formPanel}>
          <div className={styles.formBody}>
            <div className={styles.heading}><h1>{title}</h1><p>{subtitle}</p></div>
            {children}
          </div>
        </div>
        <aside className={styles.promo} aria-label="Возможности QR-S.ru">
          <div className={styles.promoHeading}><h2>Всё, чем вы делитесь.<br />В одном месте.</h2><p>От первой ссылки до материалов всей команды. Создавайте QR-коды и возвращайтесь к ним, когда нужно.</p></div>
          <div className={styles.productPreview} aria-label="Пример оформления QR-кода">
            <div className={styles.qrCard}><span>ВАША СЛЕДУЮЩАЯ ИДЕЯ</span><strong>Начинается<br />с одного скана.</strong><HomeQrPreview value="https://qr-s.ru" /><span>qr-s.ru <span aria-hidden="true">↗</span></span></div>
            <div className={styles.fileStack} aria-hidden="true"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v4m8-4v4M3 10h18M3 5h18v16H3V5ZM7 14h3m4 0h3m-10 4h3" /></svg><span>Программа события<small>Материалы для гостей</small></span></div><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 21v-2a7 7 0 0 1 14 0v2" /></svg><span>Мои контакты<small>Всегда под рукой</small></span></div></div>
            <span className={styles.exampleLabel}>Пример · QR ведёт на qr-s.ru</span>
          </div>
          <div className={styles.promoFoot}>
            {mode === "register" && planName && <h3>Начните с тарифа «{planName}»</h3>}
            <ul>{promoFeatures.map(feature => <li key={feature}><CheckIcon /><span>{feature}</span></li>)}</ul>
          </div>
        </aside>
      </main>
      <AuthLegalFooter />
    </div>
  );
}
