"use client";

import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import {
  apiDocsEndpoints,
  apiDocsNav,
  methodBadgeVariant,
  type ApiEndpoint,
} from "@/lib/api-docs-content";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMediaQuery } from "@/hooks/use-media-query";

type Props = {
  baseUrl: string;
};

function MethodBadge({ method }: { method: ApiEndpoint["method"] }) {
  return <Badge variant={methodBadgeVariant[method]}>{method}</Badge>;
}

function CodeBlock({ children }: { children: string }) {
  return <div><pre className="qrs-api-docs-pre"><code>{children}</code></pre><CopyButton value={children} label="Скопировать пример" /></div>;
}

export function ApiDocsClient({ baseUrl }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState(apiDocsNav[0]?.id ?? "authentication");
  const overlayNav = useMediaQuery("(max-width: 980px)");
  const navRef = useRef<HTMLElement>(null);
  const navId = useId();
  const overlayClosed = overlayNav && !navOpen;
  const closeNav = useCallback(() => setNavOpen(false), []);

  useFocusTrap(overlayNav && navOpen, navRef, closeNav);

  const groups = useMemo(() => {
    const map = new Map<string, typeof apiDocsNav>();
    for (const item of apiDocsNav) {
      const group = item.group ?? "Разделы";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    }
    return [...map.entries()];
  }, []);

  useEffect(() => {
    const sections = apiDocsNav.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    setActiveId(id);
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="qrs-api-docs">
      {navOpen ? (
        <button
          type="button"
          className="qrs-scrim qrs-api-docs-scrim"
          aria-label="Закрыть навигацию"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        ref={navRef}
        id={navId}
        className={`qrs-api-docs-nav ${navOpen ? "open" : ""}`}
        aria-label="Разделы документации"
        inert={overlayClosed ? true : undefined}
        aria-hidden={overlayClosed ? true : undefined}
        tabIndex={overlayNav && navOpen ? -1 : undefined}
      >
        <div className="qrs-api-docs-nav-inner qrs-scroll">
          {groups.map(([group, items]) => (
            <div key={group} className="qrs-api-docs-nav-group">
              <div className="qrs-api-docs-nav-group-title">{group}</div>
              <ul className="qrs-api-docs-nav-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`qrs-api-docs-nav-link ${activeId === item.id ? "active" : ""}`}
                      onClick={() => scrollTo(item.id)}
                      aria-current={activeId === item.id ? "true" : undefined}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <div className="qrs-api-docs-content qrs-scroll">
        <div className="qrs-api-docs-mobile-bar">
          <button
            type="button"
            className="fk-button fk-button--secondary fk-button--sm"
            aria-expanded={navOpen}
            aria-controls={navId}
            onClick={() => setNavOpen(true)}
          >
            Разделы
          </button>
        </div>

        <section id="authentication" className="qrs-api-docs-section">
          <h2 className="qrs-api-docs-section-title">Аутентификация</h2>
          <p className="qrs-api-docs-text">API поддерживает два способа аутентификации:</p>
          <ul className="qrs-api-docs-list">
            <li>
              <strong>Сессия (cookie)</strong> — при работе из браузера, будучи залогиненным
            </li>
            <li>
              <strong>API-ключ</strong> — заголовок{" "}
              <code className="qrs-api-docs-inline-code">Authorization: Bearer qre_xxxxxxxx</code>
            </li>
          </ul>
          <p className="qrs-api-docs-text">
            API-ключи доступны на тарифе Бизнес и создаются в{" "}
            <Link href="/dashboard/api-keys" className="qrs-navlink">
              разделе API-ключи
            </Link>
            .
          </p>
        </section>

        <section id="base-url" className="qrs-api-docs-section">
          <h2 className="qrs-api-docs-section-title">Базовый URL</h2>
          <CodeBlock>{`${baseUrl}/api`}</CodeBlock>
        </section>

        {apiDocsEndpoints.map((endpoint) => (
          <section key={endpoint.id} id={endpoint.id} className="qrs-api-docs-section qrs-api-docs-endpoint">
            <div className="qrs-api-docs-endpoint-head">
              <MethodBadge method={endpoint.method} />
              <code className="qrs-api-docs-path">{endpoint.path}</code>
            </div>
            <h3 className="qrs-api-docs-endpoint-title">{endpoint.title}</h3>
            <p className="qrs-api-docs-text">{endpoint.description}</p>
            {endpoint.body ? <CodeBlock>{endpoint.body}</CodeBlock> : null}
            {endpoint.response ? <CodeBlock>{endpoint.response}</CodeBlock> : null}
          </section>
        ))}

        <section id="curl-example" className="qrs-api-docs-section">
          <h2 className="qrs-api-docs-section-title">Пример (curl)</h2>
          <CodeBlock>{`curl -X POST ${baseUrl}/api/qr \\
  -H "Authorization: Bearer qre_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspaceId": "your_workspace_id",
    "name": "Тест",
    "kind": "STATIC",
    "contentType": "URL",
    "payload": { "url": "https://example.com" },
    "style": {}
  }'`}</CodeBlock>
        </section>
      </div>
    </div>
  );
}
