"use client";

import { useEffect, useRef } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const firstItemRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (firstItemRef.current) {
      firstItemRef.current.open = true;
    }
  }, []);

  return (
    <dl style={{ display: "flex", flexDirection: "column", gap: "12px", margin: 0 }}>
      {items.map((faq, index) => (
        <details
          key={faq.question}
          ref={index === 0 ? firstItemRef : undefined}
          className="qrs-details"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <summary
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "20px 24px",
              font: "var(--fw-bold) 1.05rem/1.4 var(--font-display)",
              color: "var(--text-strong)",
            }}
          >
            {faq.question}
            <svg
              className="qrs-chev"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0, color: "var(--text-muted)" }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <dd
            style={{
              margin: 0,
              padding: "0 24px 22px",
              font: "var(--fw-regular) 1rem/1.65 var(--font-sans)",
              color: "var(--text-muted)",
            }}
          >
            {faq.answer}
          </dd>
        </details>
      ))}
    </dl>
  );
}
