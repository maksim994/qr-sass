import type { ReactNode } from "react";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { Logo } from "@/components/logo";
import { getSeoPages } from "@/lib/seo-content";
import { landingDetails } from "@/lib/landing-details";
import { LEGAL_OPERATOR } from "@/lib/legal-documents";

type Props = {
  session: { sub: string } | null;
  children?: ReactNode;
};

export async function SiteFooter({ session, children }: Props) {
  const db = getDb();
  const settings = await db.siteSettings.findUnique({
    where: { id: "default" },
  });

  const linkStyle = {
    font: "var(--fw-regular) var(--fs-sm)/1.4 var(--font-sans)",
    color: "var(--text-muted)",
  } as const;

  return (
    <footer style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-page)" }}>
      {children}
      <div className="fk-container" style={{ paddingBlock: "48px" }}>
        <div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5"
          style={{ gap: "32px 24px" }}
        >
          <div>
            <Logo href="/" size="md" />
            <p style={{ marginTop: "12px", ...linkStyle, maxWidth: "16em" }}>
              Меняйте ссылку в QR после печати. PNG и SVG для экрана и типографии.
            </p>
          </div>

          <div>
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Продукт
            </p>
            <ul className="mt-3 space-y-2" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {[
                { label: "Как работает", href: "/#how" },
                { label: "Тарифы", href: "/#pricing" },
                { label: "FAQ", href: "/#faq" },
                { label: "Блог", href: "/blog" },
                { label: "История изменений", href: "/changelog" },
                ...(children ? [
                  { label: "Сценарии по отраслям", href: "/#use-cases" },
                  { label: "Все типы QR", href: "/#types" },
                ] : []),
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Решения с QR-кодами">
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Решения
            </p>
            <ul className="mt-3 space-y-2" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {getSeoPages().map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {landingDetails[page.slug]?.label ?? page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Аккаунт
            </p>
            <ul className="mt-3 space-y-2" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {session ? (
                <>
                  <li>
                    <Link href="/dashboard" className="hover:opacity-80 transition-opacity" style={linkStyle}>
                      Панель управления
                    </Link>
                  </li>
                  <li>
                    <form action="/api/auth/logout" method="post" className="inline">
                      <button type="submit" className="hover:opacity-80 transition-opacity" style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Выйти
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="hover:opacity-80 transition-opacity" style={linkStyle}>
                      Войти
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:opacity-80 transition-opacity" style={linkStyle}>
                      Регистрация
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Реквизиты и контакты
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", ...linkStyle }}>
              <li style={{ marginBottom: "8px" }}>{settings?.requisitesName || LEGAL_OPERATOR.name}</li>
              <li style={{ marginBottom: "8px" }}>{LEGAL_OPERATOR.status}</li>
              <li style={{ marginBottom: "8px" }}>{LEGAL_OPERATOR.city}</li>
              <li style={{ marginBottom: "8px" }}>ИНН: {settings?.requisitesInn || LEGAL_OPERATOR.inn}</li>
              <li style={{ marginBottom: "8px" }}>
                  <a href={`mailto:${settings?.contactEmail || LEGAL_OPERATOR.email}`} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {settings?.contactEmail || LEGAL_OPERATOR.email}
                  </a>
              </li>
              <li>
                  <a href={`tel:${(settings?.contactPhone || LEGAL_OPERATOR.phone).replace(/[^+\d]/g, "")}`} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {settings?.contactPhone || LEGAL_OPERATOR.phone}
                  </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col md:flex-row items-center justify-between pt-8"
          style={{ borderTop: "1px solid var(--border-subtle)", font: "var(--fw-regular) var(--fs-sm)/1.4 var(--font-sans)", color: "var(--text-subtle)" }}
        >
          <nav aria-label="Правовая информация" className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4 md:mb-0">
            <Link href="/privacy-policy" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              Политика конфиденциальности
            </Link>
            <Link href="/privacy-policy#cookie-settings" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>Настройки cookie</Link>
            <Link href="/terms-of-service" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              Пользовательское соглашение
            </Link>
            <Link href="/terms-of-service#payment" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>Оплата и доступ</Link>
            <Link href="/terms-of-service#refund" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>Возврат денег</Link>
            <Link href="/personal-data-consent" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>Согласие на обработку данных</Link>
            <Link href="/qr-lifetime" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              Срок жизни QR
            </Link>
          </nav>
          <div>&copy; {new Date().getFullYear()} qr-s.ru. Все права защищены.</div>
        </div>
      </div>
    </footer>
  );
}
