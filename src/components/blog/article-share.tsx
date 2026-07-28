"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export function ArticleShare({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-subtle)", marginRight: "4px" }}>
        Поделиться
      </span>
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="qrs-share"
        aria-label="Telegram"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "8px",
          border: "1px solid var(--border-default)",
          background: "var(--surface-card)",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="qrs-share"
        aria-label={copied ? "Ссылка скопирована" : "Скопировать ссылку"}
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "8px",
          border: "1px solid var(--border-default)",
          background: "var(--surface-card)",
          color: copied ? "var(--color-primary)" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    </div>
  );
}
