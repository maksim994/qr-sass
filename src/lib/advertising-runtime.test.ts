import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { startAdvertising, stopAdvertising, trackAdvertisingPageView, VK_GOALS } from "./advertising-runtime.ts";
import { isAnalyticsEnabled, isAdvertisingEnabled, saveCookiePreferences, readAdvertisingChoice } from "./cookie-consent.ts";
import { trackGoal, PRODUCT_GOALS } from "./product-analytics.ts";
function browser() {
  const dom = new JSDOM("<html><head></head></html>", { url: "https://qr-s.ru/" });
  const old = new Map(["window", "document", "Event"].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const k of ["window", "document", "Event"] as const) Object.defineProperty(globalThis, k, { value: k === "window" ? dom.window : dom.window[k], configurable: true });
  return { hits: () => (window as unknown as { _tmr: Record<string, unknown>[] })._tmr, close() { dom.window.close(); for (const [k, v] of old) if (v) Object.defineProperty(globalThis, k, v); else Reflect.deleteProperty(globalThis, k); } };
}
test("both independent category combinations work and migrated common refusal disables both", () => {
  const b = browser();
  try {
    assert.equal(isAnalyticsEnabled(), true); assert.equal(isAdvertisingEnabled(), true);
    window.localStorage.setItem("qrs_cookie_choice", JSON.stringify({ choice: "declined", at: 1, version: "old" }));
    assert.equal(isAnalyticsEnabled(), false); assert.equal(isAdvertisingEnabled(), false);
    saveCookiePreferences(false, true); assert.equal(isAnalyticsEnabled(), false); assert.equal(isAdvertisingEnabled(), true);
    startAdvertising(); assert.ok(document.querySelector("script#tmr-code"));
    assert.equal(trackGoal(PRODUCT_GOALS.pricing_viewed), true); assert.equal(b.hits()[1].goal, "pricingview");
    saveCookiePreferences(true, false); stopAdvertising(); assert.equal(isAnalyticsEnabled(), true); assert.equal(isAdvertisingEnabled(), false);
    assert.equal(document.querySelector("script#tmr-code"), null); assert.equal(trackGoal(PRODUCT_GOALS.pricing_viewed), false);
    window.localStorage.setItem("qrs_cookie_choice", JSON.stringify({ choice: "accepted", version: "old", at: 1 }));
    document.cookie = "qrs_advertising_disabled=; Max-Age=0; Path=/";
    assert.equal(readAdvertisingChoice(), "none");
  } finally { b.close(); }
});
test("one pageView per SPA URL; exactly five VK goal mappings with no account parameters", () => {
  const b = browser();
  try {
    startAdvertising(); startAdvertising(); trackAdvertisingPageView(); assert.equal(b.hits().length, 1);
    for (const goal of Object.keys(VK_GOALS)) trackGoal(goal as Parameters<typeof trackGoal>[0], { email: "private@example.test", userId: "private", paymentId: "private", raw: "private", revenue: 299, utmSource: "private" });
    const goals = b.hits().slice(1); assert.equal(goals.length, 5);
    for (const hit of goals) assert.deepEqual(Object.keys(hit).sort(), hit.goal === "paymentsuccess" ? ["goal", "id", "type", "value"] : ["goal", "id", "type"]);
    assert.equal(goals.at(-1)?.value, 299);
    window.history.pushState({}, "", "/pricing?email=private@example.test"); trackAdvertisingPageView(); trackAdvertisingPageView();
    assert.equal(b.hits().filter(h => h.type === "pageView").length, 2); assert.equal(b.hits().at(-1)?.url, "https://qr-s.ru/pricing");
    saveCookiePreferences(true, false); stopAdvertising();
    assert.doesNotThrow(() => trackGoal(PRODUCT_GOALS.pricing_viewed));
  } finally { b.close(); }
});
test("admin, API, redirects and hosted QR pages cannot load advertising or emit goals", () => {
  const b = browser();
  try { for (const path of ["/admin", "/api/users", "/r/test", "/p/test", "/reset-password"]) {
    window.history.replaceState({}, "", path); startAdvertising();
    assert.equal(document.querySelector("script#tmr-code"), null); assert.equal(trackGoal(PRODUCT_GOALS.pricing_viewed), false);
  } } finally { b.close(); }
});
