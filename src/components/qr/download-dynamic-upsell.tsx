"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QrStyle } from "@/components/qr-designer";
import { dismissDownloadUpsell, saveDownloadQrDraft } from "@/lib/download-qr-draft";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

type Props = {
  contentType: string;
  name: string;
  payload: Record<string, unknown>;
  style: QrStyle;
  isAuthenticated: boolean;
  onClose: () => void;
};

export function DownloadDynamicUpsell({
  contentType,
  name,
  payload,
  style,
  isAuthenticated,
  onClose,
}: Props) {
  const router = useRouter();

  function handleClose() {
    dismissDownloadUpsell();
    onClose();
  }

  function handleCta() {
    saveDownloadQrDraft({ contentType, name, payload, style });
    trackGoal(PRODUCT_GOALS.download_upsell_click, { type: contentType });
    const typeLower = contentType.toLowerCase();
    if (isAuthenticated) {
      router.push(`/dashboard/billing?from=download&type=${typeLower}`);
      return;
    }
    router.push(`/register?from=download&type=${typeLower}`);
  }

  return (
    <div className="qrs-download-upsell" role="region" aria-label="Предложение динамического QR">
      <button
        type="button"
        className="qrs-download-upsell__close"
        onClick={handleClose}
        aria-label="Закрыть"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      <p className="qrs-download-upsell__text">
        Ссылка может поменяться? Сделайте код динамическим: адрес меняется в кабинете, код на печати остаётся тем же.{" "}
        <span className="qrs-download-upsell__hint">2 кода бесплатно</span>
      </p>
      <div className="qrs-download-upsell__actions">
        <button type="button" className="fk-button fk-button--accent fk-button--sm" onClick={handleCta}>
          Сделать динамическим
        </button>
        <Link href="/dynamic-qr" className="qrs-download-upsell__more">
          Подробнее
        </Link>
      </div>
    </div>
  );
}
