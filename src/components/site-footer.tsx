import Link from "next/link";
import { getDb } from "@/lib/db";
import { Logo } from "@/components/logo";

type Props = {
  session: { sub: string } | null;
};

export async function SiteFooter({ session }: Props) {
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
      <div className="fk-container" style={{ paddingBlock: "48px" }}>
        <div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5"
          style={{ gap: "32px 24px" }}
        >
          <div>
            <Logo href="/" size="md" />
            <p style={{ marginTop: "12px", ...linkStyle, maxWidth: "16em" }}>
              Создавайте, кастомизируйте и отслеживайте QR-коды в одном месте.
            </p>
          </div>

          <div>
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Продукт
            </p>
            <ul className="mt-3 space-y-2" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {[
                { label: "Возможности", href: "/#features" },
                { label: "Типы кодов", href: "/#types" },
                { label: "Тарифы", href: "/#pricing" },
                { label: "FAQ", href: "/#faq" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
              Решения
            </p>
            <ul className="mt-3 space-y-2" style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              <li>
                <Link href="/blog" className="hover:opacity-80 transition-opacity" style={linkStyle}>
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:opacity-80 transition-opacity" style={linkStyle}>
                  История изменений
                </Link>
              </li>
            </ul>
          </div>

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
              Контакты
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", ...linkStyle }}>
              {settings?.requisitesName && <li style={{ marginBottom: "8px" }}>{settings.requisitesName}</li>}
              {settings?.requisitesInn && <li style={{ marginBottom: "8px" }}>ИНН: {settings.requisitesInn}</li>}
              {settings?.contactEmail && (
                <li style={{ marginBottom: "8px" }}>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings?.contactPhone && (
                <li>
                  <a href={`tel:${settings.contactPhone}`} className="hover:opacity-80 transition-opacity" style={linkStyle}>
                    {settings.contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col md:flex-row items-center justify-between pt-8"
          style={{ borderTop: "1px solid var(--border-subtle)", font: "var(--fw-regular) var(--fs-sm)/1.4 var(--font-sans)", color: "var(--text-subtle)" }}
        >
          <div className="flex gap-4 mb-4 md:mb-0">
            <Link href="/privacy-policy" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              Политика конфиденциальности
            </Link>
            <Link href="/terms-of-service" className="hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }}>
              Пользовательское соглашение
            </Link>
          </div>
          <div>&copy; {new Date().getFullYear()} qr-s.ru. Все права защищены.</div>
        </div>
      </div>
    </footer>
  );
}
