type Props = {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function DashboardPageHeader({ title, description, action, className = "" }: Props) {
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
