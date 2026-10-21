import { LEGAL_VERSION } from "@/lib/legal-documents";
import { ANALYTICS_OPTOUT_COOKIE, COOKIE_NOTICE_VERSION, isSiteAnalyticsSurface } from "@/lib/analytics-policy";
export const COOKIE_CHOICE_KEY = "qrs_cookie_choice";
export const COOKIE_NOTICE_KEY = "qrs_cookie_notice";
export const COOKIE_SETTINGS_EVENT = "qrs:cookie-settings";
export const COOKIE_CHANGE_EVENT = "qrs:cookie-change";
export type CookieChoice = "accepted" | "declined" | "none" | "ssr" | "unavailable";
const MAX_AGE = 180 * 86400000;
let memory: string | null = null;
let noticeMemory = false;
let writeFailed = false;

export function parseCookieChoice(raw: string | null, now = Date.now()): CookieChoice {
  try {
    const value = JSON.parse(raw ?? "null");
    // A clear refusal survives policy revisions and expiry. Only the user may re-enable.
    if (value?.choice === "declined") return "declined";
    if (!value || value.version !== LEGAL_VERSION || !Number.isFinite(value.at) || value.at > now || now - value.at >= MAX_AGE) return "none";
    return value.choice === "accepted" ? "accepted" : "none";
  } catch { return "none"; }
}
export function readCookieChoice(): CookieChoice {
  if (typeof window === "undefined") return "ssr";
  try {
    if (typeof document !== "undefined" && document.cookie.split(";").some(pair => pair.trim() === `${ANALYTICS_OPTOUT_COOKIE}=1`)) return "declined";
  } catch { return "unavailable"; }
  if (writeFailed && memory !== null) return parseCookieChoice(memory);
  try {
    const current = parseCookieChoice(window.localStorage.getItem(COOKIE_CHOICE_KEY));
    if (current !== "none") return current;
    return "none"; // The retired cookie_consent key never controls categories.
  } catch {
    // Never start tracking when an existing refusal cannot be read.
    return memory === null ? "unavailable" : parseCookieChoice(memory);
  }
}
export function isAnalyticsEnabled(choice: CookieChoice = readCookieChoice()) {
  return (choice === "none" || choice === "accepted") && (typeof window === "undefined" || isSiteAnalyticsSurface(window.location.pathname));
}
export function syncAnalyticsOptOut(disabled: boolean) {
  if (typeof document === "undefined") return;
  try { document.cookie = `${ANALYTICS_OPTOUT_COOKIE}=${disabled ? "1" : ""}; Max-Age=${disabled ? 31536000 : 0}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* The local preference and revoke request must still proceed. */ }
}
export function readCookieNotice() {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem(COOKIE_NOTICE_KEY) === COOKIE_NOTICE_VERSION || noticeMemory; }
  catch { return noticeMemory; }
}
export function acknowledgeCookieNotice() {
  noticeMemory = true;
  try { window.localStorage.setItem(COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(COOKIE_CHANGE_EVENT));
}
export const ADVERTISING_OPTOUT_COOKIE = "qrs_advertising_disabled";
export function readAdvertisingChoice(): CookieChoice {
  if (typeof window === "undefined") return "ssr";
  try {
    if (document.cookie.split(";").some(pair => pair.trim() === `${ADVERTISING_OPTOUT_COOKIE}=1`)) return "declined";
    const raw = writeFailed && memory !== null ? memory : window.localStorage.getItem(COOKIE_CHOICE_KEY);
    const value = JSON.parse(raw ?? "null");
    if (value?.schema === 2 && typeof value.advertising === "boolean") {
      if (!value.advertising) return "declined";
      return Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < MAX_AGE ? "accepted" : "none";
    }
    return value?.choice === "declined" ? "declined" : "none";
  } catch { return "unavailable"; }
}
export function isAdvertisingEnabled(choice: CookieChoice = readAdvertisingChoice()) {
  return (choice === "none" || choice === "accepted") && (typeof window === "undefined" || isSiteAnalyticsSurface(window.location.pathname));
}
export function saveCookiePreferences(analytics: boolean, advertising: boolean) {
  memory = JSON.stringify({ schema: 2, choice: analytics ? "accepted" : "declined", advertising, version: LEGAL_VERSION, at: Date.now() });
  syncAnalyticsOptOut(!analytics);
  try { document.cookie = `${ADVERTISING_OPTOUT_COOKIE}=${advertising ? "" : "1"}; Max-Age=${advertising ? 0 : 31536000}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* Local storage still saves the selection. */ }
  try { window.localStorage.setItem(COOKIE_CHOICE_KEY, memory); writeFailed = false; } catch { writeFailed = true; }
  try { window.localStorage.removeItem("cookie_consent"); } catch { /* Preserve refusals through the new key/cookie. */ }
  window.dispatchEvent(new Event(COOKIE_CHANGE_EVENT));
}

export function saveCookieChoice(choice: "accepted" | "declined") {
  saveCookiePreferences(choice === "accepted", choice === "accepted");
}
