const DISMISS_KEY = "qrs_download_upsell_dismissed_until";
export const DOWNLOAD_UPSELL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function canOfferDynamicQr(contentType: string, kind: string, dynamicRemaining?: number | null) {
  return contentType === "URL" && kind === "STATIC" && dynamicRemaining !== null;
}

export function isDownloadUpsellDismissed(now = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(until) && until > now;
  } catch { return false; }
}

export function dismissDownloadUpsell(now = Date.now()) {
  try { localStorage.setItem(DISMISS_KEY, String(now + DOWNLOAD_UPSELL_DISMISS_MS)); }
  catch { /* Dismissal still applies to the current component when storage is disabled. */ }
}
