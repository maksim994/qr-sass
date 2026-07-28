import type { ReactNode } from "react";

type HeaderProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Shared page header — mirrors DashboardPageHeader patterns */
export function AdminPageHeader({ title, description, action, className = "" }: HeaderProps) {
  return (
    <div className={`qrs-page-head ${className}`.trim()}>
      <div>
        <h1
          style={{
            font: "var(--fw-extra) clamp(1.7rem, 4vw, 2.1rem)/1.1 var(--font-display)",
            color: "var(--text-strong)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description ? (
          <p style={{ marginTop: "8px", font: "var(--fw-regular) 15px/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </div>
  );
}

/** Table wrapper — same pattern as dashboard team / analytics */
export function AdminDataCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`qrs-data-card ${className}`.trim()}>{children}</div>;
}
