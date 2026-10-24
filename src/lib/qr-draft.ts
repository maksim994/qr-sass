import { isSafeUrl } from "@/lib/url";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { parseStaticQrDraft, readStaticDraftSnapshot } from "@/lib/static-qr-draft";
import { styleSchema } from "@/lib/validation";
import type { QrStyle } from "@/components/qr-designer";
import { parseStyleConfig } from "@/lib/qr-style-config";
import { getQrTypeInfo } from "@/lib/qr-types";

export const QR_DRAFT_STORAGE_KEY = "qrs-create-draft";
export const QR_DRAFT_EVENT = "qrs-create-draft";
export const QR_DRAFT_MAX_URL = 2000;

export type QrCreateDraft = {
  v: 1;
  contentType: "URL";
  url: string;
  kind: "STATIC" | "DYNAMIC";
  name?: string;
  style?: QrStyle;
  createdAt?: number;
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

export function parseQrCreateDraft(raw: unknown, now = Date.now()): QrCreateDraft | null {
  let value = raw;
  if (typeof value === "string") {
    if (value.length > 24000) return null;
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
  if (draft.createdAt !== undefined && (typeof draft.createdAt !== "number" || !Number.isFinite(draft.createdAt) || draft.createdAt > now || now - draft.createdAt > 3600000)) return null;
  if (draft.name !== undefined && (typeof draft.name !== "string" || draft.name.length > 120)) return null;
  const style = draft.style === undefined ? undefined : styleSchema.safeParse(draft.style);
  if (style && !style.success) return null;
  return { v: 1, contentType: "URL", url, kind,
    ...(typeof draft.name === "string" ? { name: draft.name } : {}),
    ...(style?.success ? { style: parseStyleConfig(style.data) } : {}),
    ...(typeof draft.createdAt === "number" ? { createdAt: draft.createdAt } : {}),
  };
}

// Query parameters win; restore appearance only for the same URL and requested kind.
export function resolveQrCreateDraft(prefill: QrCreateDraft | null, stored: QrCreateDraft | null) {
  if (!prefill) return stored;
  return stored?.url === prefill.url && stored.kind === prefill.kind ? { ...stored, ...prefill } : prefill;
}

export function createQrContinuePath(draft: QrCreateDraft): string {
  const next = new URL("/dashboard/create/url", "https://qr-s.invalid");
  next.searchParams.set("kind", draft.kind);
  next.searchParams.set("url", draft.url);
  return `${next.pathname}${next.search}`;
}

/** Keep old PR links useful without allowing arbitrary post-registration redirects. */
export function legacyQrIntentPath(query: { from?: string; intent?: string; type?: string }): string | undefined {
  if (query.from === "download") return "/dashboard/create/url?kind=DYNAMIC";
  const type = query.type?.toUpperCase();
  return query.intent === "create" && type && getQrTypeInfo(type) ? `/dashboard/create/${type.toLowerCase()}` : undefined;
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

export function writeQrCreateDraft(draft: QrCreateDraft): boolean {
  if (typeof window === "undefined") return false;
  const parsed = parseQrCreateDraft(draft);
  if (!parsed) return false;
  try {
    const serialized = JSON.stringify(parsed);
    if (serialized.length > 24000) return false;
    localStorage.setItem(QR_DRAFT_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(QR_DRAFT_EVENT));
    return true;
  } catch {
    return false;
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
  if (parseStaticQrDraft(readStaticDraftSnapshot())) return "/dashboard/create";
  const draft = readQrCreateDraft();
  return draft ? createQrContinuePath(draft) : "/dashboard";
}
