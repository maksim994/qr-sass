import { isAdvertisingEnabled } from "@/lib/cookie-consent";
import { analyticsPageUrl } from "@/lib/metrika-runtime";
export const VK_COUNTER_ID = "3807133";
export const ADVERTISING_READY_EVENT = "qrs:advertising-ready";
export const VK_GOALS = { registration_completed: "registration", dynamic_enabled: "dynamicqrcreated", pricing_view: "pricingview", checkout_started: "checkoutstart", payment_succeeded: "paymentsuccess" } as const;
type Hit = { id: string; type: string; goal?: string; value?: number; url?: string; referrer?: string; start?: number; beat?: boolean; timespent?: boolean };
type Queue = { push: (hit: Hit) => unknown; length?: number };
type AdWindow = Window & { _tmr?: Queue; __qrsVkPage?: string; __qrsVkActive?: boolean };
export function startAdvertising() {
  if (!isAdvertisingEnabled()) return;
  const w = window as AdWindow;
  if (w.__qrsVkActive) return;
  w._tmr = [] as Hit[];
  w.__qrsVkActive = true;
  trackAdvertisingPageView();
  const script = document.createElement("script");
  script.id = "tmr-code"; script.src = "https://top-fwz1.mail.ru/js/code.js"; script.async = true;
  document.head.appendChild(script);
  window.dispatchEvent(new Event(ADVERTISING_READY_EVENT));
}
export function trackAdvertisingPageView() {
  const w = window as AdWindow;
  if (!isAdvertisingEnabled() || !w.__qrsVkActive) return;
  const url = analyticsPageUrl(window.location.href);
  if (!url || w.__qrsVkPage === url) return;
  // Request no heartbeat/time-spent tracking; never add account dimensions.
  w._tmr?.push({ id: VK_COUNTER_ID, type: "pageView", url, referrer: w.__qrsVkPage ?? analyticsPageUrl(document.referrer), start: Date.now(), beat: false, timespent: false });
  w.__qrsVkPage = url;
}
export function stopAdvertising() {
  const w = window as AdWindow;
  const active = !!w.__qrsVkActive;
  document.querySelectorAll('script#tmr-code, script[src^="https://top-fwz1.mail.ru/"]').forEach(s => s.remove());
  if (Array.isArray(w._tmr)) w._tmr.length = 0;
  // The SDK has no documented destruct API. Stop its public entry points, then the
  // owner immediately reloads when it was active to end all SDK listeners/timers.
  const sdk = w._tmr;
  if (sdk && !Array.isArray(sdk)) for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(sdk) ?? {})) {
    if (key !== "constructor" && typeof (sdk as unknown as Record<string, unknown>)[key] === "function") {
      (sdk as unknown as Record<string, unknown>)[key] = () => undefined;
    }
  }
  w._tmr = { push: () => undefined };
  delete w.__qrsVkPage; delete w.__qrsVkActive;
  return active;
}
export function trackAdvertisingGoal(goal: string, params?: Record<string, unknown>) {
  if (!isAdvertisingEnabled()) return false;
  const name = VK_GOALS[goal as keyof typeof VK_GOALS];
  const w = window as AdWindow;
  if (!name || !w.__qrsVkActive || !w._tmr) return false;
  const hit: Hit = { id: VK_COUNTER_ID, type: "reachGoal", goal: name };
  if (name === "paymentsuccess" && typeof params?.revenue === "number" && Number.isFinite(params.revenue) && params.revenue >= 0) hit.value = params.revenue;
  try { w._tmr.push(hit); return true; } catch { return false; }
}
export function advertisingReady() { return typeof window !== "undefined" && isAdvertisingEnabled() && !!(window as AdWindow).__qrsVkActive; }
