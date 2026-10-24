import Link from "next/link";
import type { QrTypeInfo } from "@/lib/qr-types";
import { getQrTypeLandingPath } from "@/lib/qr-type-landings";

type Props = {
  types: QrTypeInfo[];
  isAuthenticated: boolean;
};

export function HomeTypeTiles({ types, isAuthenticated }: Props) {
  return (
    <div
      className="qrs-grid-3 qrs-home-types-grid"
      style={{
        marginTop: "44px",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "16px",
      }}
    >
      {types.map((t) => {
        const createHref = isAuthenticated
          ? `/dashboard/create/${t.type.toLowerCase()}`
          : `/register?intent=create&type=${t.type.toLowerCase()}`;
        const landingHref = getQrTypeLandingPath(t.type);

        return (
          <article
            key={t.type}
            className="qrs-home-type-tile"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "18px 18px 20px" }}
          >
            <Link href={createHref} className="qrs-home-type-tile__main qrs-row-lift" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary)" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              <div style={{ marginTop: "12px", font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>{t.label}</div>
              <div style={{ marginTop: "4px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{t.description}</div>
            </Link>
            {landingHref ? (
              <a href={landingHref} className="qrs-navlink qrs-home-type-tile__more" style={{ display: "inline-block", marginTop: "12px" }}>
                Подробнее →
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
