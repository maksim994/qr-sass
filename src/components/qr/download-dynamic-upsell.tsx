"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QrStyle } from "@/components/qr-designer";
import { Button } from "@/components/ui/button";
import { createQrContinuePath, writeQrCreateDraft } from "@/lib/qr-draft";
import { dismissDownloadUpsell } from "@/lib/download-upsell";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import { COMMERCIAL } from "@/lib/commercial-config";
import styles from "./download-dynamic-upsell.module.css";

export type DownloadUpsellDraft = {
  payload: Record<string, unknown>;
  name?: string;
  dynamicRemaining?: number | null;
};

export function DownloadDynamicUpsell({ payload, name, style, dynamicRemaining, signedIn, onClose, onContinueDynamic }: DownloadUpsellDraft & {
  style: QrStyle;
  signedIn: boolean;
  onClose: () => void;
  onContinueDynamic?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function continueDynamic() {
    if (pending) return;
    const draft = { v: 1 as const, contentType: "URL" as const, kind: "DYNAMIC" as const,
      url: String(payload.url ?? ""), name, style, createdAt: Date.now() };
    if (!writeQrCreateDraft(draft)) { setError(MSG.QR_DRAFT_STORAGE_UNAVAILABLE); return; }
    setPending(true);
    trackGoal(PRODUCT_GOALS.download_upsell_click, { contentType: "URL", source: signedIn ? "editor" : "public" });
    const path = createQrContinuePath(draft);
    // App Router preserves editor state when only the query changes, including a prior STATIC override.
    onContinueDynamic?.();
    router.push(signedIn ? path : `/register?next=${encodeURIComponent(path)}`);
  }

  return <aside className={styles.upsell} aria-label="Менять ссылку после печати">
    <button className={styles.close} type="button" aria-label="Закрыть предложение" onClick={() => { dismissDownloadUpsell(); onClose(); }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
    </button>
    <strong>Ссылка может поменяться?</strong>
    <p>У динамического QR адрес меняется в кабинете. Для печати скачайте новый динамический код — уже скачанный статический файл останется прежним.</p>
    <p>{dynamicRemaining === 0 ? "Бесплатные динамические коды уже использованы. Продолжите в редакторе, чтобы выбрать подходящий тариф." : `${dynamicRemaining ?? COMMERCIAL.free.dynamic} динамических кода бесплатно. Проверьте ссылку и сохраните новый код в редакторе.`}</p>
    <div className={styles.actions}>
      <Button type="button" size="sm" disabled={pending} onClick={continueDynamic}>{pending ? "Открываем редактор…" : "Сделать динамическим"}</Button>
      <Link href="/dynamic-qr">Подробнее</Link>
    </div>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
