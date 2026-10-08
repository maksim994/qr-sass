import { readCookieChoice } from "@/lib/cookie-consent";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import type { MetrikaAttribution } from "@/lib/metrika-attribution";

/** A blocked counter must not prevent checkout. No cookie parsing or fallback IDs. */
export async function getMetrikaAttribution(): Promise<MetrikaAttribution | null> {
  if (typeof window === "undefined" || readCookieChoice() !== "accepted") return null;
  const counterId = document.documentElement.dataset.ymId;
  const ym = (window as Window & { ym?: (...args: unknown[]) => void }).ym;
  if (!counterId || !ym) return null;
  return new Promise(resolve => {
    let finished = false;
    const finish = (clientId?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve(readCookieChoice() === "accepted" && typeof clientId === "string" && /^\d{1,30}$/.test(clientId)
        ? { clientId, counterId, consentVersion: LEGAL_VERSION } : null);
    };
    const timeout = setTimeout(finish, 500);
    try { ym(counterId, "getClientID", finish); } catch { finish(); }
  });
}
