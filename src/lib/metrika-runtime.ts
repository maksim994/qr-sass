import { isAnalyticsEnabled } from "@/lib/cookie-consent";
import { METRIKA_READY_EVENT, setMetrikaCounterId } from "@/lib/product-analytics";
type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
type AnalyticsWindow = Window & { ym?: Ym; __qrsYmId?: string };
export function startMetrika(id: string) {
  if (!/^\d+$/.test(id) || !isAnalyticsEnabled()) return;
  const w = window as AnalyticsWindow;
  if (w.__qrsYmId === id) return;
  if (!w.ym) {
    const queue: Ym = (...args) => { (queue.a ??= []).push(args); };
    queue.l = Date.now(); w.ym = queue;
  }
  const script = document.createElement("script");
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  script.async = true; script.dataset.qrsAnalytics = "true";
  document.head.appendChild(script);
  w.ym(id, "init", { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  setMetrikaCounterId(id);
  window.dispatchEvent(new Event(METRIKA_READY_EVENT));
}
export function stopMetrika() {
  const w = window as AnalyticsWindow;
  const active = !!w.__qrsYmId;
  if (w.ym?.a) w.ym.a.length = 0; // Clear an init still waiting for tag.js.
  if (active) try { w.ym?.(w.__qrsYmId, "destruct"); } catch { /* Reload ends the runtime. */ }
  delete w.__qrsYmId; delete (w as AnalyticsWindow & { __qrsYmPage?: string }).__qrsYmPage; delete document.documentElement.dataset.ymId;
  document.querySelectorAll("script[data-qrs-analytics]").forEach(s => s.remove());
  const domains = ["", window.location.hostname, `.${window.location.hostname}`];
  let cookies = "";
  try { cookies = document.cookie; } catch { /* Cookie access may be denied. */ }
  for (const pair of cookies.split(";")) {
    const name = pair.trim().split("=")[0];
    if (!name.startsWith("_ym_")) continue;
    for (const domain of domains) try { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`; } catch { /* Reload and server revoke still run. */ }
  }
  // Remove only this service's analytics retry/visitor keys, never sessions or choices.
  for (const storage of ["localStorage", "sessionStorage"] as const) try {
    const target = window[storage];
    for (let i = target.length - 1; i >= 0; i--) { const key = target.key(i); if (key?.startsWith("_ym")) target.removeItem(key); }
  } catch { /* Storage may be unavailable. */ }
  return active;
}

/** Keep campaign attribution, omit QR payloads, credentials, tokens and fragments. */
export function analyticsPageUrl(value: string) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.username = ""; url.password = ""; url.hash = "";
    const allowed = /^(utm_(source|medium|campaign|content|term|referrer)|yclid|ysclid|gclid|gbraid|wbraid|ref)$/;
    for (const key of Array.from(url.searchParams.keys())) if (!allowed.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return ""; }
}
export function trackMetrikaPageView(id: string) {
  if (!isAnalyticsEnabled()) return;
  const w = window as AnalyticsWindow & { __qrsYmPage?: string };
  const url = analyticsPageUrl(window.location.href);
  if (!url || w.__qrsYmId !== id || !w.ym || w.__qrsYmPage === url) return;
  const referer = w.__qrsYmPage ?? analyticsPageUrl(document.referrer);
  w.ym(id, "hit", url, { title: document.title, referer });
  w.__qrsYmPage = url;
}
