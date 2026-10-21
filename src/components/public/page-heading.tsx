import Link from "next/link";
import type { ReactNode } from "react";

/** Shared outer rhythm; page-specific content and reading measures stay local. */
export function PublicPageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="qrs-public-heading"><h1>{title}</h1>{children}</header>;
}

export function PublicBreadcrumb({ current }: { current: string }) {
  return <nav className="qrs-public-breadcrumb" aria-label="Хлебные крошки">
    <Link href="/">Главная</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span>
  </nav>;
}
