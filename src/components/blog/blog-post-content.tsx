"use client";

import DOMPurify from "isomorphic-dompurify";
import { useEffect, useRef, useState } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
}

type TocItem = { id: string; text: string };

type Props = { content: string };

export function BlogPostContent({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const headings = el.querySelectorAll<HTMLHeadingElement>("h2");
    const items: TocItem[] = [];
    const usedIds = new Set<string>();
    headings.forEach((h, i) => {
      const text = h.textContent || "";
      let id = slugify(text) || `section-${i}`;
      if (usedIds.has(id)) {
        let n = 1;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      h.id = id;
      items.push({ id, text });
    });
    setTocItems(items);
  }, [content]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    tocItems.forEach(({ id }) => {
      const target = el.querySelector(`#${CSS.escape(id)}`);
      if (target) observer.observe(target);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const articleHeight = el.offsetHeight;
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      const readAmount = Math.max(0, Math.min(articleHeight, viewportCenter - articleTop));
      const pct = articleHeight > 0 ? Math.min(100, Math.round((readAmount / articleHeight) * 100)) : 0;
      setProgress(pct);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [content]);

  return (
    <div className="qrs-article-grid">
      {tocItems.length > 0 && (
        <>
          <div className="qrs-toc-mobile order-first">
            <button
              type="button"
              onClick={() => setMobileTocOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl p-4 text-left"
              style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
            >
              <span style={{ font: "var(--fw-semibold) var(--fs-base)/1 var(--font-sans)", color: "var(--text-strong)" }}>Содержание</span>
              <svg
                className={`h-5 w-5 transition-transform ${mobileTocOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--text-muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {mobileTocOpen && (
              <nav className="mt-2 space-y-1 rounded-xl p-4" style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)" }}>
                {tocItems.map(({ id, text }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      scrollToSection(id);
                      setMobileTocOpen(false);
                    }}
                    className="block w-full text-left py-1.5 text-sm"
                    style={{ color: activeId === id ? "var(--color-primary)" : "var(--text-muted)", fontWeight: activeId === id ? 600 : 400 }}
                  >
                    {text}
                  </button>
                ))}
                <p className="mt-3 pt-3 text-xs" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-subtle)" }}>
                  Прогресс: {progress}%
                </p>
              </nav>
            )}
          </div>

          <aside className="qrs-toc-col" style={{ position: "sticky", top: "96px" }}>
          <div>
            <div style={{ font: "var(--fw-bold) 12px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: "14px" }}>
              Содержание
            </div>
            <nav className="qrs-toc" aria-label="Содержание статьи">
              {tocItems.map(({ id, text }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  style={{
                    color: activeId === id ? "var(--color-primary)" : "var(--text-muted)",
                    fontWeight: activeId === id ? 700 : 500,
                  }}
                >
                  {text}
                </button>
              ))}
            </nav>
            <div style={{ marginTop: "26px", padding: "18px", borderRadius: "12px", background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ font: "var(--fw-bold) 14px/1.3 var(--font-display)", color: "var(--text-strong)" }}>Попробуйте бесплатно</div>
              <p style={{ marginTop: "6px", font: "var(--fw-regular) 12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>Первый динамический QR — без карты.</p>
              <a href="/register" className="fk-button fk-button--accent fk-button--sm" style={{ width: "100%", marginTop: "12px" }}>Создать QR</a>
            </div>
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text-subtle)" }}>Прогресс чтения</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-sunken)" }}>
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{ width: `${progress}%`, background: "var(--color-primary)" }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-medium" style={{ color: "var(--text-subtle)" }}>{progress}%</p>
            </div>
          </div>
        </aside>
        </>
      )}

      <div
        ref={containerRef}
        className="min-w-0 qrs-body"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
              "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
              "strong", "b", "em", "i", "u", "s", "code", "pre",
              "ul", "ol", "li", "blockquote", "a", "img",
              "table", "thead", "tbody", "tr", "th", "td",
            ],
            ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
          }),
        }}
      />
    </div>
  );
}
