import type { QrStyle } from "@/components/qr-designer";

const DRAFT_KEY = "qrs_download_qr_draft";
const UPSELL_DISMISS_KEY = "qrs_download_upsell_dismissed_until";
const DISMISS_DAYS = 7;

export type DownloadQrDraft = {
  contentType: string;
  name: string;
  payload: Record<string, unknown>;
  style: QrStyle;
  savedAt: number;
};

export function saveDownloadQrDraft(draft: Omit<DownloadQrDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: DownloadQrDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readDownloadQrDraft(): DownloadQrDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DownloadQrDraft;
    if (!parsed?.contentType || !parsed.style) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDownloadQrDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function dismissDownloadUpsell() {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(UPSELL_DISMISS_KEY, String(until));
  } catch {
    /* ignore */
  }
}

export function isDownloadUpsellDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(UPSELL_DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() < until) return true;
    localStorage.removeItem(UPSELL_DISMISS_KEY);
    return false;
  } catch {
    return false;
  }
}
