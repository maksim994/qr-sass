import assert from "node:assert/strict";
import { test } from "node:test";
import { canOfferDynamicQr, dismissDownloadUpsell, isDownloadUpsellDismissed, DOWNLOAD_UPSELL_DISMISS_MS } from "./download-upsell.ts";

test("download offer covers static URL, respects unlimited dynamic rights and supports quota exhaustion", () => {
  assert.equal(canOfferDynamicQr("URL", "STATIC", 2), true);
  assert.equal(canOfferDynamicQr("URL", "STATIC", 0), true);
  assert.equal(canOfferDynamicQr("URL", "STATIC"), true);
  assert.equal(canOfferDynamicQr("URL", "STATIC", null), false);
  assert.equal(canOfferDynamicQr("URL", "DYNAMIC", 2), false);
  for (const type of ["WIFI", "TEXT", "EMAIL", "VCARD", "PDF"]) assert.equal(canOfferDynamicQr(type, "STATIC", 2), false);
});

test("dismissal lasts seven days across reloads, tolerates malformed values and disabled storage", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    const now = 10000;
    assert.equal(isDownloadUpsellDismissed(now), false);
    dismissDownloadUpsell(now);
    assert.equal(isDownloadUpsellDismissed(now + DOWNLOAD_UPSELL_DISMISS_MS - 1), true);
    assert.equal(isDownloadUpsellDismissed(now + DOWNLOAD_UPSELL_DISMISS_MS), false);
    values.set("qrs_download_upsell_dismissed_until", "broken");
    assert.equal(isDownloadUpsellDismissed(now), false);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Error("blocked"); } });
    assert.doesNotThrow(() => dismissDownloadUpsell());
    assert.equal(isDownloadUpsellDismissed(now), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
