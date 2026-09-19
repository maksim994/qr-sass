"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { TrackedDownloadLink } from "@/components/dashboard/tracked-download-link";
import { DeleteQrDialog } from "@/components/delete-qr-dialog";
import styles from "./qr-library-card-menu.module.css";
import { MSG } from "@/lib/user-messages";

type Props = {
  qrId: string;
  qrName?: string;
  kind: "STATIC" | "DYNAMIC";
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
};

export function QrLibraryCardMenu({ qrId, qrName, kind, exportFormats }: Props) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<DOMRect | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const anchor = triggerRef.current.getBoundingClientRect();
    anchorRef.current = anchor;
    const panel = panelRef.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(anchor.right - panel.width, window.innerWidth - panel.width - 8)),
      top: Math.max(8, anchor.bottom + panel.height + 8 > window.innerHeight ? anchor.top - panel.height - 6 : anchor.bottom + 6),
    });
    panelRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const focusable = Array.from(document.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )).filter((element) => !panelRef.current?.contains(element) && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
        const index = triggerRef.current ? focusable.indexOf(triggerRef.current) : -1;
        const next = focusable[index + (event.shiftKey ? -1 : 1)];
        setOpen(false);
        (next ?? triggerRef.current)?.focus();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    function closeOnMove(event: Event) {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (event.type === "resize" || !anchor || anchor.top !== anchorRef.current?.top || anchor.left !== anchorRef.current?.left) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", closeOnMove);
    window.addEventListener("scroll", closeOnMove, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", closeOnMove);
      window.removeEventListener("scroll", closeOnMove, true);
    };
  }, [open]);

  async function duplicate() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetchApi(`/api/qr/${qrId}/duplicate`, { method: "POST" });
      const parsed = await parseApiResponse<{ qrId?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.COULD_NOT_DUPLICATE_QR);
        return;
      }
      if (parsed.data?.qrId) router.push(`/dashboard/qr/${parsed.data.qrId}`);
      router.refresh();
    } catch {
      setError(MSG.COULD_NOT_DUPLICATE_QR);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function confirmDelete() {
    setOpen(false);
    triggerRef.current?.focus();
    setConfirming(true);
  }

  return (
    <div className="qrs-lib-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="qrs-lib-menu-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={qrName ? `Действия: ${qrName}` : "Действия с QR-кодом"}
        aria-haspopup="menu"
        onClick={() => { setError(""); setOpen((v) => !v); }}
        disabled={busy}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open ? createPortal(
        <div ref={panelRef} id={menuId} className="qrs-lib-menu-panel" role="menu" aria-label="Действия с QR-кодом" style={{ maxHeight: "calc(100dvh - 16px)", overflowY: "auto", position: "fixed", top: position.top, left: position.left, right: "auto", zIndex: 450 }}>
          <Link href={`/dashboard/qr/${qrId}`} className="qrs-lib-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Открыть
          </Link>
          <Link href={`/dashboard/qr/${qrId}/edit`} className="qrs-lib-menu-item" role="menuitem" onClick={() => setOpen(false)}>Редактировать</Link>
          {exportFormats.map((format) => (
            <TrackedDownloadLink key={format}
              href={`/api/qr/${qrId}/download?format=${format.toLowerCase()}`}
              className="qrs-lib-menu-item"
              role="menuitem"
              download
              onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
            >
              Скачать {format}
            </TrackedDownloadLink>
          ))}
          <button type="button" className="qrs-lib-menu-item" role="menuitem" onClick={duplicate} disabled={busy}>
            {busy ? "Создаём копию…" : "Дублировать"}
          </button>
          <button type="button" className="qrs-lib-menu-item qrs-lib-menu-item--danger" role="menuitem" onClick={confirmDelete} disabled={busy}>
            Удалить
          </button>
        </div>, document.body
      ) : null}

      {error ? createPortal(<div className={styles.error} role="alert">
        <p>{error}</p>
        <button type="button" className="fk-button fk-button--secondary fk-button--sm" onClick={() => setError("")}>Закрыть</button>
      </div>, document.body) : null}
      {confirming && <DeleteQrDialog qrId={qrId} qrName={qrName} kind={kind}
        onClose={() => setConfirming(false)}
        onDeleted={() => { setConfirming(false); router.refresh(); }}
      />}
    </div>
  );
}
