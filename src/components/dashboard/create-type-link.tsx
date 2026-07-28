"use client";

import Link from "next/link";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

type Props = {
  type: string;
  label: string;
  description: string;
  icon: string;
  locked?: boolean;
  lockHint?: string;
};

export function CreateTypeLink({ type, label, description, icon, locked, lockHint }: Props) {
  const href = `/dashboard/create/${type.toLowerCase()}`;

  const content = (
    <>
      <span
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
      </span>
      <div style={{ marginTop: "14px", font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>
        {label}
      </div>
      <div style={{ marginTop: "4px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
        {description}
      </div>
      {lockHint ? (
        <div style={{ marginTop: "10px", font: "var(--fw-semibold) 12px/1.2 var(--font-sans)", color: "var(--color-warning)" }}>
          {lockHint}
        </div>
      ) : null}
    </>
  );

  const style = {
    textAlign: "left" as const,
    background: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: "12px",
    padding: "20px",
    display: "block",
    opacity: locked ? 0.72 : 1,
  };

  if (locked) {
    return (
      <Link
        href="/dashboard/billing"
        className="qrs-row-lift"
        style={style}
        onClick={() => trackGoal(PRODUCT_GOALS.qr_type_selected, { type, locked: true })}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="qrs-row-lift"
      style={style}
      onClick={() => trackGoal(PRODUCT_GOALS.qr_type_selected, { type })}
    >
      {content}
    </Link>
  );
}
