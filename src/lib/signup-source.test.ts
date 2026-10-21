import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { captureFirstTouch, readFirstTouch, FIRST_TOUCH_KEY, FIRST_TOUCH_TTL, normalizeSignupSource, registrationSource, signupSourceLabel, sourceCaptureAllowed, sourceReferrer } from "./signup-source.ts";
function browser(path = "/?utm_source=test&utm_medium=cpc&utm_campaign=t1&vkclid=vk-test") {
  const dom = new JSDOM("<html></html>", { url: `https://qr-s.ru${path}`, referrer: "https://outside.example/article?email=private#secret" });
  const old = new Map(["window", "document"].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  return () => { dom.window.close(); for (const [key, value] of old) if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); };
}
test("first touch survives a second campaign, both category refusals and navigation to registration", () => {
  const close = browser();
  try {
    window.localStorage.setItem("qrs_cookie_choice", JSON.stringify({ choice: "declined", advertising: false }));
    const first = captureFirstTouch()!;
    assert.equal(signupSourceLabel(first), "test/cpc/t1");
    assert.equal(first.referrer, "outside.example/article"); assert.equal(first.landingPath, "/");
    assert.equal(first.clickIdType, "vkclid"); assert.equal(first.clickId, "vk-test");
    window.history.pushState({}, "", "/?utm_source=other");
    assert.deepEqual(captureFirstTouch(), first);
    window.history.pushState({}, "", "/register"); assert.deepEqual(readFirstTouch(), first);
    assert.notEqual(captureFirstTouch(Date.parse(first.firstTouchAt) + FIRST_TOUCH_TTL)?.firstTouchAt, first.firstTouchAt);
  } finally { close(); }
});
test("source validation bounds values, strips control characters, URL secrets and own-domain referrals", () => {
  const raw = { utmSource: "a".repeat(300) + "\n", landingPath: "/first?token=secret#hash", referrer: "https://user:pass@outside.example/path?token=secret#hash", firstTouchAt: new Date().toISOString(), clickId: "click\nid", clickIdType: "yclid" };
  const normalized = normalizeSignupSource(raw, "https://qr-s.ru")!;
  assert.equal(normalized.utmSource?.length, 255); assert.equal(normalized.referrer, "outside.example/path"); assert.equal(normalized.landingPath, "/first"); assert.equal(normalized.clickId, "clickid");
  assert.equal(sourceReferrer("https://www.qr-s.ru/register", "https://qr-s.ru"), null);
  assert.equal(sourceReferrer("javascript:alert(1)", "https://qr-s.ru"), null);
  assert.equal(normalizeSignupSource({ ...raw, firstTouchAt: "invalid" }, "https://qr-s.ru"), null);
  assert.equal(normalizeSignupSource({ ...raw, firstTouchAt: new Date(Date.now() + 3600000).toISOString() }, "https://qr-s.ru"), null);
  assert.equal(registrationSource(null, new Request("https://qr-s.ru/api/auth/register", { headers: { referer: "https://outside.example/path?token=private" } })).referrer, "outside.example/path");
  assert.equal(signupSourceLabel(registrationSource(null, new Request("https://qr-s.ru/api/auth/register"))), "прямой заход");
  assert.equal(signupSourceLabel(null), "нет данных");
});
test("no first-touch writes on protected surfaces, blocked storage is safe, corrupt records recover", () => {
  for (const path of ["/r/code", "/admin", "/api/qr", "/p/code", "/dashboard", "/reset-password"]) assert.equal(sourceCaptureAllowed(path), false);
  const close = browser();
  try {
    window.localStorage.setItem(FIRST_TOUCH_KEY, "{broken"); assert.equal(captureFirstTouch()?.utmSource, "test");
    window.localStorage.clear(); window.history.replaceState({}, "", "/r/never-opened"); assert.equal(captureFirstTouch(), null); assert.equal(window.localStorage.length, 0);
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("denied", "SecurityError"); } });
    assert.doesNotThrow(() => captureFirstTouch()); assert.equal(readFirstTouch(), null);
  } finally { close(); }
});
