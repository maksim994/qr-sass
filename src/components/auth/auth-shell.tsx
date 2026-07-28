"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export type AuthMode = "login" | "register";

const DEFAULT_PROMO_FEATURES = [
  "Первый QR бесплатно, без карты",
  "Данные на серверах в РФ",
  "12 000+ компаний уже с нами",
] as const;

type AuthShellProps = {
  mode: AuthMode;
  title: string;
  subtitle: string;
  children: ReactNode;
  planName?: string;
  planFeatures?: string[];
};

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

export function AuthTabs({ mode }: { mode: AuthMode }) {
  return (
    <div className="qrs-auth-tabs" role="tablist" aria-label="Вход или регистрация">
      <Link
        href="/login"
        role="tab"
        aria-selected={mode === "login"}
        className={`qrs-auth-tabs__btn${mode === "login" ? " qrs-auth-tabs__btn--active" : ""}`}
      >
        Вход
      </Link>
      <Link
        href="/register"
        role="tab"
        aria-selected={mode === "register"}
        className={`qrs-auth-tabs__btn${mode === "register" ? " qrs-auth-tabs__btn--active" : ""}`}
      >
        Регистрация
      </Link>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="qrs-auth-divider" aria-hidden="true">
      <span>или</span>
    </div>
  );
}

export function YandexAuthButton({ mode }: { mode: AuthMode }) {
  const label = mode === "login" ? "Войти через Яндекс" : "Зарегистрироваться через Яндекс";

  return (
    <Button href="/api/auth/yandex" variant="secondary" block className="qrs-auth-yandex">
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

export function AuthSwitchLink({ mode }: { mode: AuthMode }) {
  if (mode === "login") {
    return (
      <p className="qrs-auth-switch">
        Ещё нет аккаунта?{" "}
        <Link href="/register" className="qrs-auth-switch__link">
          Зарегистрируйтесь
        </Link>
      </p>
    );
  }

  return (
    <p className="qrs-auth-switch">
      Уже есть аккаунт?{" "}
      <Link href="/login" className="qrs-auth-switch__link">
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
  const promoFeatures =
    mode === "register" && planFeatures && planFeatures.length > 0
      ? planFeatures
      : [...DEFAULT_PROMO_FEATURES];

  return (
    <div className="qrs-auth">
      <aside className="qrs-auth__promo" aria-label="О сервисе QR-S.ru">
        <div className="qrs-auth__promo-inner">
          <Logo href="/" size="md" inverted showTagline={false} />

          <div className="qrs-auth__promo-copy">
            <h2 className="qrs-auth__promo-title">QR-коды, которые работают на вас</h2>
            <p className="qrs-auth__promo-subtitle">
              Динамические коды с аналитикой сканирований, кастомизацией дизайна и мгновенным экспортом.
            </p>
          </div>

          {mode === "register" && planName ? (
            <p className="qrs-auth__plan-badge">Тариф «{planName}»</p>
          ) : null}

          <ul className="qrs-auth__promo-features" aria-label="Преимущества сервиса">
            {promoFeatures.map((feature) => (
              <li key={feature}>
                <span className="qrs-auth__promo-check" aria-hidden="true">
                  <CheckIcon />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="qrs-auth__rating">
            <span className="qrs-auth__stars" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} />
              ))}
            </span>
            <span>4,9 из 5 — более 2 100 отзывов</span>
          </div>
        </div>
      </aside>

      <div className="qrs-auth__panel">
        <div className="qrs-auth__panel-top">
          <Link href="/" className="qrs-auth-home">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            На главную
          </Link>
        </div>

        <div className="qrs-auth__panel-body">
          <div className="qrs-auth__heading">
            <h1 className="qrs-auth__title">{title}</h1>
            <p className="qrs-auth__subtitle">{subtitle}</p>
          </div>

          <AuthTabs mode={mode} />

          {children}
        </div>

        <AuthLegalFooter />
      </div>
    </div>
  );
}
