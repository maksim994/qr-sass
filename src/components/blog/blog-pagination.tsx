import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  category?: string;
};

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export function BlogPagination({ currentPage, totalPages, category }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Пагинация блога" className="mt-12 flex justify-center gap-2 flex-wrap">
      {currentPage > 1 && (
        <Link
          href={pageHref(currentPage - 1, category)}
          className="fk-button fk-button--secondary fk-button--sm"
        >
          ← Назад
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(p, category)}
          className={`fk-button fk-button--sm ${p === currentPage ? "fk-button--primary" : "fk-button--secondary"}`}
          aria-current={p === currentPage ? "page" : undefined}
        >
          {p}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link
          href={pageHref(currentPage + 1, category)}
          className="fk-button fk-button--secondary fk-button--sm"
        >
          Вперёд →
        </Link>
      )}
    </nav>
  );
}
