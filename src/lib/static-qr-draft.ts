import { prepareStaticQr, type StaticQrType } from "@/lib/static-qr";
import { styleSchema } from "@/lib/validation";
import type { QrStyle } from "@/components/qr-designer";

export const STATIC_DRAFT_KEY = "qrs-static-archive-draft";
export const STATIC_DRAFT_EVENT = "qrs-static-archive-draft";
export type StaticQrDraft = { v: 1; createdAt: number; contentType: StaticQrType; payload: Record<string, unknown>; style: QrStyle };

export function parseStaticQrDraft(raw: string | null, now = Date.now()): StaticQrDraft | null {
  try {
    if (!raw || raw.length > 24000) return null;
    const value = JSON.parse(raw);
    if (value.v !== 1 || typeof value.createdAt !== "number" || value.createdAt > now || now - value.createdAt > 3600000 || !value.payload || typeof value.payload !== "object") return null;
    const qr = prepareStaticQr(value.contentType, value.payload);
    const style = styleSchema.safeParse(value.style);
    // A public draft never carries remote images or workspace file references.
    if (!qr.ok || !style.success || style.data.logoUrl || style.data.logoFileId || style.data.logoScale) return null;
    return { ...value, payload: qr.payload, style: style.data };
  } catch { return null; }
}

export function readStaticDraftSnapshot() {
  try { return typeof window === "undefined" ? null : sessionStorage.getItem(STATIC_DRAFT_KEY); } catch { return null; }
}
export function writeStaticQrDraft(draft: StaticQrDraft): boolean {
  try {
    sessionStorage.setItem(STATIC_DRAFT_KEY, JSON.stringify(draft));
    window.dispatchEvent(new Event(STATIC_DRAFT_EVENT)); return true;
  } catch { return false; }
}
export function clearStaticQrDraft() {
  try { sessionStorage.removeItem(STATIC_DRAFT_KEY); window.dispatchEvent(new Event(STATIC_DRAFT_EVENT)); } catch { /* Storage may be disabled. */ }
}
export function subscribeStaticDraft(listener: () => void) {
  window.addEventListener(STATIC_DRAFT_EVENT, listener);
  return () => window.removeEventListener(STATIC_DRAFT_EVENT, listener);
}
