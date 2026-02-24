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
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      {tocItems.length > 0 && (
        <>
          {/* Mobile TOC - above content on small screens */}
          <div className="lg:hidden order-first">
            <button
              type="button"
              onClick={() => setMobileTocOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"
            >
              <span className="font-semibold text-slate-900">Содержание</span>
              <svg
                className={`h-5 w-5 text-slate-500 transition-transform ${mobileTocOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {mobileTocOpen && (
              <nav className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-4">
                {tocItems.map(({ id, text }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      scrollToSection(id);
                      setMobileTocOpen(false);
                    }}
                    className={`block w-full text-left py-1.5 text-sm ${activeId === id ? "font-medium text-blue-600" : "text-slate-600"}`}
                  >
                    {text}
                  </button>
                ))}
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Прогресс: {progress}%
                </p>
              </nav>
            )}
          </div>

          <aside className="hidden shrink-0 lg:block lg:w-80 lg:order-none">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <h2 className="font-semibold text-slate-900">Содержание</h2>
            </div>
            <nav className="mt-4 space-y-1">
              {tocItems.map(({ id, text }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`block w-full text-left rounded-lg py-1.5 pl-1 text-sm transition-colors ${
                    activeId === id
                      ? "border-l-2 border-blue-600 pl-2 font-medium text-blue-600"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {text}
                </button>
              ))}
            </nav>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500">Прогресс чтения</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-medium text-slate-500">{progress}%</p>
            </div>
          </div>
        </aside>
        </>
      )}

      <div
        ref={containerRef}
        className="min-w-0 flex-1 prose prose-slate max-w-none prose-headings:font-semibold prose-h2:mt-10 prose-h2:text-xl prose-h2:text-slate-900 prose-h2:scroll-mt-24 prose-p:text-slate-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-blue-600 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:font-normal prose-blockquote:italic prose-blockquote:text-slate-700 prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-ul:text-slate-700"
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
