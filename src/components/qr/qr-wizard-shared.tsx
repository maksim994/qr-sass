"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useMemo, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { QrTypeIcon } from "@/components/qr-type-icon";
import type { QrStyle } from "@/components/qr-designer";
import { downloadQrPreview, downloadSavedQr } from "@/lib/qr-preview-download";
import styles from "@/components/dashboard/create-flow.module.css";
import navigationStyles from "./qr-wizard-shared.module.css";
import { MSG } from "@/lib/user-messages";
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
  return <Link href={href} className={navigationStyles.backLink}>{label}</Link>;
}

export function QrWizardPageHead({
  backHref,
  backLabel = "К QR-коду",
  contentType,
  title,
  subtitle,
  kindControl,
}: {
  backHref: string;
  backLabel?: string;
  contentType: string;
  title: string;
  subtitle: string;
  kindControl?: ReactNode;
}) {
  return (
    <>
    <QrWizardBackLink href={backHref} label={backLabel} />
    <div className="qrs-wizard-head">
      <div className="qrs-wizard-head-start">
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
    </>
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

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange("DYNAMIC");
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[1]?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange("STATIC");
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[0]?.focus();
    }
  }

  return (
    <div className="qrs-segment" role="radiogroup" aria-label="Тип QR-кода" onKeyDown={onKeyDown}>
      <button
        type="button"
        role="radio"
        aria-checked={value === "STATIC"}
        tabIndex={value === "STATIC" ? 0 : -1}
        className={`qrs-segment__btn${value === "STATIC" ? " qrs-segment__btn--active" : ""}`}
        onClick={() => onChange("STATIC")}
      >
        Статический
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "DYNAMIC"}
        tabIndex={value === "DYNAMIC" ? 0 : -1}
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
  contentId,
  designId,
}: {
  value: "content" | "design";
  onChange: (tab: "content" | "design") => void;
  contentId: string;
  designId: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange("design");
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[1]?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange("content");
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[0]?.focus();
    }
  }

  return (
    <div className="qrs-wizard-tabs" role="tablist" aria-label="Разделы мастера" onKeyDown={onKeyDown}>
      <button
        type="button"
        role="tab"
        id={`${contentId}-tab`}
        aria-selected={value === "content"}
        aria-controls={contentId}
        tabIndex={value === "content" ? 0 : -1}
        className={`qrs-wizard-tabs__btn${value === "content" ? " qrs-wizard-tabs__btn--active" : ""}`}
        onClick={() => onChange("content")}
      >
        Содержимое
      </button>
      <button
        type="button"
        role="tab"
        id={`${designId}-tab`}
        aria-selected={value === "design"}
        aria-controls={designId}
        tabIndex={value === "design" ? 0 : -1}
        className={`qrs-wizard-tabs__btn${value === "design" ? " qrs-wizard-tabs__btn--active" : ""}`}
        onClick={() => onChange("design")}
      >
        Оформление
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
  readable = false,
  downloadBlockedReason,
  lifetimeHint,
  qrId,
  id,
  previewReady = true,
  emptyPreviewTitle,
  emptyPreviewHint,
  saveDisabled = false,
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
  downloadBlockedReason?: string;
  lifetimeHint?: ReactNode;
  qrId?: string;
  id?: string;
  previewReady?: boolean;
  emptyPreviewTitle?: string;
  emptyPreviewHint?: string;
  saveDisabled?: boolean;
}) {
  const [downloadError, setDownloadError] = useState("");
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
    if (!style) return;
    if (!readable) return;
    setDownloading(format);
    setDownloadError("");
    try {
      if (qrId) {
        await downloadSavedQr(qrId, format);
      } else if (previewData) {
        await downloadQrPreview(previewData, style, format);
      } else {
        return;
      }
      markOnboardingDownloaded();
    } catch {
      setDownloadError(MSG.COULD_NOT_DOWNLOAD);
    } finally {
      setDownloading(null);
    }
  }

  const canDownload = Boolean((qrId || previewData) && style && readable && !downloadBlockedReason);

  return (
    <div className="qrs-preview" id={id}>
      <div className="qrs-preview-card">
        <div className="qrs-preview-head">
          <div className="qrs-preview-title">Предпросмотр</div>
          <span className={`qrs-preview-badge${kindLabel === "Динамический" ? " qrs-preview-badge--dynamic" : ""}`}>
            {kindLabel}
          </span>
        </div>

        {hostedPreview && <div className="qrs-preview-frame qrs-preview-frame--hosted">{hostedPreview}</div>}
        {!previewReady && <div className={styles.previewEmpty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /><path d="M8 12h8m-4-4v8" /></svg>
          <strong>{emptyPreviewTitle}</strong><p>{emptyPreviewHint}</p>
        </div>}
        <div hidden={!previewReady}>
          <div className="qrs-preview-frame" style={{ ...(hostedPreview ? { marginTop: "16px" } : {}), ...previewFrameStyle }}>
            <div ref={qrRef} className="qrs-preview-qr" />
          </div>
        </div>

        {shortLink ? (
          <p className="qrs-preview-shortlink">{shortLink}</p>
        ) : null}

        {error || downloadError ? (
          <div style={{ marginTop: "12px" }}>
            <Alert variant="danger">{error || downloadError}</Alert>
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
        ) : downloadBlockedReason ? (
          <p className="qrs-preview-shortlink">{downloadBlockedReason}</p>
        ) : null}

        {lifetimeHint ? <div className="qrs-preview-lifetime">{lifetimeHint}</div> : null}

        <div className="qrs-preview-save">
          <Button variant="primary" size="lg" block disabled={saving || saveDisabled} onClick={onSave}>
            {saving ? "Сохранение…" : saveLabel}
          </Button>
        </div>

        {previewReady && <div className={`qrs-preview-readability${readable ? "" : " qrs-preview-readability--warn"}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={readable ? "var(--color-success)" : "var(--color-warning)"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: "1px" }} aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          {readable
            ? "Предварительная оценка: контраст достаточный. Проверьте код камерой перед печатью."
            : "Проверьте контраст и отступ — код может плохо сканироваться."}
        </div>}
      </div>
    </div>
  );
}
