import { isSafeUrl } from "@/lib/url";
import { safePostAuthPath } from "@/lib/safe-redirect";

export const QR_DRAFT_STORAGE_KEY = "qrs-create-draft";
export const QR_DRAFT_EVENT = "qrs-create-draft";
export const QR_DRAFT_MAX_URL = 2000;

export type QrCreateDraft = {
  v: 1;
  contentType: "URL";
  url: string;
  kind: "STATIC" | "DYNAMIC";
};

export function normalizeDraftUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > QR_DRAFT_MAX_URL) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (withScheme.length > QR_DRAFT_MAX_URL) return null;
  if (!isSafeUrl(withScheme)) return null;
  return withScheme;
}

export function nameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host || "Ссылка";
  } catch {
    return "Ссылка";
  }
}

export function parseQrCreateDraft(raw: unknown): QrCreateDraft | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  if (draft.v !== 1 || draft.contentType !== "URL") return null;
  const url = typeof draft.url === "string" ? normalizeDraftUrl(draft.url) : null;
  if (!url) return null;
  const kind = draft.kind === "STATIC" || draft.kind === "DYNAMIC" ? draft.kind : null;
  if (!kind) return null;
  return { v: 1, contentType: "URL", url, kind };
}

export function createQrContinuePath(draft: QrCreateDraft): string {
  const next = new URL("/dashboard/create/url", "https://qr-s.invalid");
  next.searchParams.set("kind", draft.kind);
  next.searchParams.set("url", draft.url);
  return `${next.pathname}${next.search}`;
}

export function parseCreatePrefill(searchParams: {
  url?: string | string[];
  kind?: string | string[];
}): QrCreateDraft | null {
  const urlRaw = Array.isArray(searchParams.url) ? searchParams.url[0] : searchParams.url;
  const kindRaw = Array.isArray(searchParams.kind) ? searchParams.kind[0] : searchParams.kind;
  const url = urlRaw ? normalizeDraftUrl(urlRaw) : null;
  if (!url) return null;
  const kind = kindRaw === "STATIC" ? "STATIC" : "DYNAMIC";
  return { v: 1, contentType: "URL", url, kind };
}

export function readQrDraftSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(QR_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribeQrDraft(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === QR_DRAFT_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(QR_DRAFT_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(QR_DRAFT_EVENT, listener);
  };
}

export function readQrCreateDraft(): QrCreateDraft | null {
  return parseQrCreateDraft(readQrDraftSnapshot());
}

export function writeQrCreateDraft(draft: QrCreateDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.dispatchEvent(new Event(QR_DRAFT_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function clearQrCreateDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(QR_DRAFT_STORAGE_KEY);
    window.dispatchEvent(new Event(QR_DRAFT_EVENT));
  } catch {
    /* ignore */
  }
}

export function destinationAfterAuth(nextFromQuery?: string | null): string {
  const draftFallback = fallbackFromDraft();
  if (!nextFromQuery || nextFromQuery === "/dashboard") return draftFallback;
  return safePostAuthPath(nextFromQuery, draftFallback);
}

function fallbackFromDraft(): string {
  const draft = readQrCreateDraft();
  return draft ? createQrContinuePath(draft) : "/dashboard";
}
