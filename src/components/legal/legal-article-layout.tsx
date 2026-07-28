import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
  eyebrow: string;
  title: string;
  updatedLabel?: string;
  children: ReactNode;
};

export function LegalArticleLayout({
  session,
  isAdmin = false,
  eyebrow,
  title,
  updatedLabel,
  children,
}: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-page)", color: "var(--text-default)" }}>
      <SiteHeader session={session} isAdmin={isAdmin} />
      <main>
        <section
          style={{
            padding: "clamp(40px, 6vw, 72px) 0 clamp(28px, 4vw, 44px)",
            borderBottom: "1px solid var(--border-subtle)",
            background: "radial-gradient(120% 80% at 82% -20%, var(--color-primary-subtle) 0%, transparent 55%), var(--surface-page)",
          }}
        >
          <div className="fk-container" style={{ maxWidth: "820px" }}>
            <span className="fk-eyebrow">{eyebrow}</span>
            <h1
              style={{
                marginTop: "12px",
                font: "var(--fw-extra) clamp(2rem, 4.6vw, 2.8rem)/1.1 var(--font-display)",
                letterSpacing: "-0.03em",
                color: "var(--text-strong)",
              }}
            >
              {title}
            </h1>
            {updatedLabel && (
              <p style={{ marginTop: "16px", font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-muted)" }}>
                {updatedLabel}
              </p>
            )}
          </div>
        </section>

        <section style={{ padding: "clamp(32px, 5vw, 56px) 0 var(--section-y)" }}>
          <div className="fk-container" style={{ maxWidth: "820px" }}>
            <article
              className="qrs-body"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "16px",
                boxShadow: "var(--shadow-sm)",
                padding: "clamp(24px, 4vw, 48px)",
              }}
            >
              {children}
            </article>

            <div style={{ marginTop: "48px", textAlign: "center" }}>
              <Link href="/" className="qrs-navlink" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                На главную
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter session={session} />
    </div>
  );
}
