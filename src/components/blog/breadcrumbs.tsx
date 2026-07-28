import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" style={{ font: "var(--fw-medium) var(--fs-sm)/1 var(--font-sans)" }}>
      <ol className="flex flex-wrap items-center gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span style={{ color: "var(--text-subtle)" }} aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="qrs-navlink">
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
