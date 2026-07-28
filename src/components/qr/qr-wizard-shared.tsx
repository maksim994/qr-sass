"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { useMemo, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { QrTypeIcon } from "@/components/qr-type-icon";
import type { QrStyle } from "@/components/qr-designer";
import { downloadQrPreview } from "@/lib/qr-preview-download";
import { markOnboardingDownloaded } from "@/lib/product-analytics";

const WIZARD_SUBTITLES: Partial<Record<string, string>> = {
  URL: "Редирект на любой URL с аналитикой и защитой.",
};

export function getQrWizardSubtitle(contentType: string, fallback = ""): string {
  return WIZARD_SUBTITLES[contentType] ?? fallback;
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

export function QrWizardBackLink({ href, label = "Назад" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="qrs-wizard-back" aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Link>
  );
}

export function QrWizardPageHead({
  backHref,
  contentType,
  title,
  subtitle,
  kindControl,
}: {
  backHref: string;
  contentType: string;
  title: string;
  subtitle: string;
  kindControl?: ReactNode;
}) {
  return (
    <div className="qrs-wizard-head">
      <div className="qrs-wizard-head-start">
        <QrWizardBackLink href={backHref} />
        <div className="min-w-0">
          <div className="qrs-wizard-title-row">
            <QrTypeIcon contentType={contentType} variant="blue" />
            <h1 className="qrs-wizard-title">{title}</h1>
          </div>
          <p className="qrs-wizard-subtitle">{subtitle}</p>
        </div>
      </div>
      {kindControl}
    </div>
  );
}

export function QrKindSegment({
  value,
  onChange,
  disabled,
}: {
  value: "STATIC" | "DYNAMIC";
  onChange: (kind: "STATIC" | "DYNAMIC") => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="fk-badge fk-badge--primary">
        Статический
      </span>
    );
  }

  return (
    <div className="qrs-segment" role="group" aria-label="Тип QR-кода">
      <button
        type="button"
        className={`qrs-segment__btn${value === "STATIC" ? " qrs-segment__btn--active" : ""}`}
        onClick={() => onChange("STATIC")}
      >
        Статический
      </button>
      <button
        type="button"
        className={`qrs-segment__btn${value === "DYNAMIC" ? " qrs-segment__btn--active" : ""}`}
        onClick={() => onChange("DYNAMIC")}
      >
        Динамический
      </button>
    </div>
  );
}

export function QrWizardTabs({
  value,
  onChange,
}: {
  value: "content" | "design";
  onChange: (tab: "content" | "design") => void;
}) {
  return (
    <div className="qrs-wizard-tabs" role="tablist" aria-label="Разделы мастера">
      <button
        type="button"
        role="tab"
        aria-selected={value === "content"}
        className={`qrs-wizard-tabs__btn${value === "content" ? " qrs-wizard-tabs__btn--active" : ""}`}
        onClick={() => onChange("content")}
      >
        Контент
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "design"}
        className={`qrs-wizard-tabs__btn${value === "design" ? " qrs-wizard-tabs__btn--active" : ""}`}
        onClick={() => onChange("design")}
      >
        Дизайн
      </button>
    </div>
  );
}

export function QrAdvancedAccordion({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="qrs-adv" open={defaultOpen} style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "12px", overflow: "hidden" }}>
      <summary style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", font: "var(--fw-bold) 14px/1 var(--font-sans)", color: "var(--text-strong)" }}>
        {icon}
        {title}
        <span className="qrs-chev" style={{ marginLeft: "auto", color: "var(--text-muted)" }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div style={{ padding: "4px 20px 22px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {children}
      </div>
    </details>
  );
}

export function QrStaticInfoAlert() {
  return (
    <Alert variant="info" title="Статический QR-код">
      Статический код навсегда содержит эту ссылку и работает без интернета на нашей стороне, но её нельзя изменить, а сканирования не отслеживаются. Для аналитики и смены ссылки выберите <strong>Динамический</strong>.
    </Alert>
  );
}

export function QrWizardPreview({
  kindLabel,
  qrRef,
  hostedPreview,
  saveLabel,
  saving,
  onSave,
  error,
  shortLink,
  previewData,
  style,
  readable = true,
}: {
  kindLabel: string;
  qrRef: RefObject<HTMLDivElement | null>;
  hostedPreview?: ReactNode;
  saveLabel: string;
  saving: boolean;
  onSave: () => void;
  error?: string;
  shortLink?: string | null;
  previewData?: string;
  style?: QrStyle;
  readable?: boolean;
}) {
  const [downloading, setDownloading] = useState<"png" | "svg" | null>(null);

  const previewFrameStyle = useMemo(() => {
    if (!style) return undefined;
    if (style.bgTransparent) {
      return {
        background:
          "repeating-conic-gradient(var(--surface-sunken) 0% 25%, var(--surface-card) 0% 50%) 50% / 20px 20px",
      };
    }
    return { background: style.bgColor };
  }, [style]);

  async function handleDownload(format: "png" | "svg") {
    if (!previewData || !style) return;
    setDownloading(format);
    try {
      await downloadQrPreview(previewData, style, format);
      markOnboardingDownloaded();
    } finally {
      setDownloading(null);
    }
  }

  const canDownload = Boolean(previewData && style);

  return (
    <div className="qrs-preview">
      <div className="qrs-preview-card">
        <div className="qrs-preview-head">
          <div className="qrs-preview-title">Предпросмотр</div>
          <span className={`qrs-preview-badge${kindLabel === "Динамический" ? " qrs-preview-badge--dynamic" : ""}`}>
            {kindLabel}
          </span>
        </div>

        {hostedPreview ? (
          <>
            <div className="qrs-preview-frame qrs-preview-frame--hosted">{hostedPreview}</div>
            <div className="qrs-preview-frame" style={{ marginTop: "16px", ...previewFrameStyle }}>
              <div ref={qrRef} className="qrs-preview-qr" />
            </div>
          </>
        ) : (
          <div className="qrs-preview-frame" style={previewFrameStyle}>
            <div ref={qrRef} className="qrs-preview-qr" />
          </div>
        )}

        {shortLink ? (
          <p className="qrs-preview-shortlink">{shortLink}</p>
        ) : null}

        {error ? (
          <div style={{ marginTop: "12px" }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        ) : null}

        {canDownload ? (
          <div className="qrs-preview-downloads">
            <button
              type="button"
              className="qrs-preview-download-btn"
              disabled={downloading !== null}
              onClick={() => handleDownload("png")}
            >
              <DownloadIcon />
              {downloading === "png" ? "…" : "PNG"}
            </button>
            <button
              type="button"
              className="qrs-preview-download-btn"
              disabled={downloading !== null}
              onClick={() => handleDownload("svg")}
            >
              <DownloadIcon />
              {downloading === "svg" ? "…" : "SVG"}
            </button>
          </div>
        ) : null}

        <div className="qrs-preview-save">
          <Button variant="accent" size="lg" block disabled={saving} onClick={onSave}>
            {saving ? "Сохранение…" : saveLabel}
          </Button>
        </div>

        <div className={`qrs-preview-readability${readable ? "" : " qrs-preview-readability--warn"}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={readable ? "var(--color-success)" : "var(--color-warning)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: "1px" }} aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          {readable
            ? "Проверка читаемости пройдена — код надёжно сканируется."
            : "Проверьте контраст и отступ — код может плохо сканироваться."}
        </div>
      </div>
    </div>
  );
}
