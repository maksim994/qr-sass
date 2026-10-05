import { LEGAL_VERSION } from "@/lib/legal-documents";
export const COOKIE_CHOICE_KEY = "qrs_cookie_choice";
export const COOKIE_SETTINGS_EVENT = "qrs:cookie-settings";
export const COOKIE_CHANGE_EVENT = "qrs:cookie-change";
export type CookieChoice = "accepted" | "declined" | "none" | "ssr";
const MAX_AGE = 180 * 86400000;
let memory: string | null = null;
let storageUnavailable = false;
export function parseCookieChoice(raw: string | null, now = Date.now()): CookieChoice {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== LEGAL_VERSION || !Number.isFinite(value.at) || value.at > now || now - value.at >= MAX_AGE) return "none";
    return value.choice === "accepted" || value.choice === "declined" ? value.choice : "none";
  } catch { return "none"; }
}
export function readCookieChoice(): CookieChoice {
  if (typeof window === "undefined") return "ssr";
  if (storageUnavailable) return parseCookieChoice(memory);
  try { return parseCookieChoice(window.localStorage.getItem(COOKIE_CHOICE_KEY)); }
  catch { return parseCookieChoice(memory); }
}
export function saveCookieChoice(choice: "accepted" | "declined") {
  memory = JSON.stringify({ choice, version: LEGAL_VERSION, at: Date.now() });
  try { window.localStorage.setItem(COOKIE_CHOICE_KEY, memory); storageUnavailable = false; } catch { storageUnavailable = true; }
  try { window.localStorage.removeItem("cookie_consent"); } catch { /* Legacy consent never grants permission. */ }
  window.dispatchEvent(new Event(COOKIE_CHANGE_EVENT));
}
