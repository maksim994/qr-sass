"use client";

import { useId, useState, type ReactNode } from "react";

export type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
};

type Props = {
  items: AccordionItem[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  className?: string;
};

export function Accordion({ items, defaultOpenId, allowMultiple = false, className = "" }: Props) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    if (defaultOpenId) return new Set([defaultOpenId]);
    return new Set(items[0] ? [items[0].id] : []);
  });

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (!allowMultiple) next.clear();
      next.add(id);
      return next;
    });
  }

  return (
    <div className={`fk-accordion ${className}`.trim()}>
      {items.map((item) => {
        const open = openIds.has(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const triggerId = `${baseId}-${item.id}-trigger`;

        return (
          <div key={item.id} className={`fk-accordion__item${open ? " fk-accordion__item--open" : ""}`}>
            <button
              id={triggerId}
              type="button"
              className="fk-accordion__trigger"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
            >
              <span>{item.title}</span>
              <span className="fk-accordion__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            <div id={panelId} role="region" aria-labelledby={triggerId} className="fk-accordion__panel">
              <div>
                <div className="fk-accordion__content">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
