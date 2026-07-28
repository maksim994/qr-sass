"use client";

import { useMemo, useState } from "react";
import { groupLabels, type QrTypeInfo } from "@/lib/qr-types";
import { CreateTypeLink } from "@/components/dashboard/create-type-link";
import { Alert } from "@/components/ui";

type Item = QrTypeInfo & {
  locked: boolean;
  lockHint?: string;
};

const GROUP_ORDER = ["basic", "files", "business", "social"] as const;

export function CreateTypePicker({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | (typeof GROUP_ORDER)[number]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (group !== "all" && item.group !== group) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [items, query, group]);

  const sections = useMemo(() => {
    return GROUP_ORDER.map((key) => ({
      key,
      label: groupLabels[key] ?? key,
      items: filtered.filter((item) => item.group === key),
    })).filter((section) => section.items.length > 0);
  }, [filtered]);

  return (
    <div>
      <div className="qrs-create-toolbar">
        <div className="qrs-lib-search qrs-create-search">
          <svg className="qrs-lib-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Поиск типа: меню, PDF, ссылка…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="qrs-lib-search-input"
            aria-label="Поиск типа QR"
          />
        </div>
        <div className="qrs-lib-filters" role="tablist" aria-label="Группы типов">
          <button
            type="button"
            className={`qrs-lib-filter${group === "all" ? " active" : ""}`}
            onClick={() => setGroup("all")}
          >
            Все
          </button>
          {GROUP_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              className={`qrs-lib-filter${group === key ? " active" : ""}`}
              onClick={() => setGroup(key)}
            >
              {groupLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <Alert variant="info" title="Ничего не найдено">
          Попробуйте другой запрос или сбросьте фильтр группы.
        </Alert>
      ) : (
        <div className="qrs-create-sections">
          {sections.map((section) => (
            <section key={section.key} className="qrs-create-section">
              <h2 className="qrs-create-section-title">{section.label}</h2>
              <div className="qrs-type-grid">
                {section.items.map((item) => (
                  <CreateTypeLink
                    key={item.type}
                    type={item.type}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    locked={item.locked}
                    lockHint={item.lockHint}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
