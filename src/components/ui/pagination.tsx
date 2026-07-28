import Link from "next/link";

type PageItem = number | "ellipsis";

type Props = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
  "aria-label"?: string;
};

function buildPages(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: PageItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  hrefForPage,
  className = "",
  "aria-label": ariaLabel = "Пагинация",
}: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPages(currentPage, totalPages);

  return (
    <nav aria-label={ariaLabel} className={`fk-pagination ${className}`.trim()}>
      {currentPage > 1 ? (
        <Link href={hrefForPage(currentPage - 1)} className="fk-pagination__btn" aria-label="Предыдущая страница">
          ←
        </Link>
      ) : (
        <span className="fk-pagination__btn" aria-disabled="true">
          ←
        </span>
      )}

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="fk-pagination__ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(item)}
            className={`fk-pagination__btn${item === currentPage ? " fk-pagination__btn--active" : ""}`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link href={hrefForPage(currentPage + 1)} className="fk-pagination__btn" aria-label="Следующая страница">
          →
        </Link>
      ) : (
        <span className="fk-pagination__btn" aria-disabled="true">
          →
        </span>
      )}
    </nav>
  );
}
