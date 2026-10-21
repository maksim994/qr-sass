import Link from "next/link";
import type { BlogCategoryRow } from "@/lib/blog-categories";

type Props = {
  categories: BlogCategoryRow[];
  activeSlug?: string;
};

export function BlogCategoryChips({ categories, activeSlug }: Props) {
  const isAll = !activeSlug;

  return (
    <div style={{ marginTop: "28px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
      <Link
        href="/blog"
        aria-current={isAll ? "page" : undefined}
        className="qrs-public-category"
        style={{
          whiteSpace: "nowrap",
          padding: "9px 18px",
          borderRadius: "8px",
          border: `1px solid ${isAll ? "var(--color-primary)" : "var(--border-default)"}`,
          background: isAll ? "var(--color-primary)" : "var(--surface-card)",
          color: isAll ? "var(--color-primary-on)" : "var(--text-default)",
          font: "var(--fw-semibold) 14px/1 var(--font-sans)",
          textDecoration: "none",
        }}
      >
        Все статьи
      </Link>
      {categories.map((category) => {
        const active = activeSlug === category.slug;
        return (
          <Link
            key={category.id}
            href={`/blog?category=${category.slug}`}
            aria-current={active ? "page" : undefined}
            className="qrs-public-category"
            style={{
              whiteSpace: "nowrap",
              padding: "9px 18px",
              borderRadius: "8px",
              border: `1px solid ${active ? "var(--color-primary)" : "var(--border-default)"}`,
              background: active ? "var(--color-primary)" : "var(--surface-card)",
              color: active ? "var(--color-primary-on)" : "var(--text-default)",
              font: "var(--fw-semibold) 14px/1 var(--font-sans)",
              textDecoration: "none",
            }}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
