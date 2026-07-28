"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { TrackedDownloadLink } from "@/components/dashboard/tracked-download-link";

type Props = {
  qrId: string;
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
};

export function QrLibraryCardMenu({ qrId, exportFormats }: Props) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function duplicate() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetchApi(`/api/qr/${qrId}/duplicate`, { method: "POST" });
    const parsed = await parseApiResponse<{ qrId?: string }>(res);
    setBusy(false);
    setOpen(false);
    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось скопировать QR-код.");
      return;
    }
    if (parsed.data?.qrId) {
      router.push(`/dashboard/qr/${parsed.data.qrId}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  async function archive() {
    if (busy) return;
    if (!confirm("Удалить QR-код из библиотеки?")) return;
    setBusy(true);
    setError("");
    const res = await fetchApi(`/api/qr/${qrId}`, { method: "DELETE" });
    const parsed = await parseApiResponse(res);
    setBusy(false);
    setOpen(false);
    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось удалить QR-код.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="qrs-lib-menu" ref={rootRef}>
      <button
        type="button"
        className="qrs-lib-menu-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Действия с QR-кодом"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div id={menuId} className="qrs-lib-menu-panel" role="menu">
          <Link href={`/dashboard/qr/${qrId}`} className="qrs-lib-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Открыть
          </Link>
          <Link href={`/dashboard/qr/${qrId}`} className="qrs-lib-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Аналитика
          </Link>
          {exportFormats.includes("PNG") ? (
            <TrackedDownloadLink
              href={`/api/qr/${qrId}/download?format=png`}
              className="qrs-lib-menu-item"
              role="menuitem"
              download
              onClick={() => setOpen(false)}
            >
              Скачать PNG
            </TrackedDownloadLink>
          ) : null}
          {exportFormats.includes("SVG") ? (
            <TrackedDownloadLink
              href={`/api/qr/${qrId}/download?format=svg`}
              className="qrs-lib-menu-item"
              role="menuitem"
              download
              onClick={() => setOpen(false)}
            >
              Скачать SVG
            </TrackedDownloadLink>
          ) : null}
          <button type="button" className="qrs-lib-menu-item" role="menuitem" onClick={duplicate} disabled={busy}>
            Дублировать
          </button>
          <button type="button" className="qrs-lib-menu-item qrs-lib-menu-item--danger" role="menuitem" onClick={archive} disabled={busy}>
            Удалить
          </button>
        </div>
      ) : null}

      {error ? <div className="qrs-lib-menu-error">{error}</div> : null}
    </div>
  );
}
