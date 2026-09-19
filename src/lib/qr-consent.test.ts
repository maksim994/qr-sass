import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasQrConsent,
  requiredConsentVersion,
  stampTrackingConsentVersion,
  qrConsentCookieName,
} from "./qr-consent.ts";

test("pixel changes bump consent version so old cookies do not apply", () => {
  const next = stampTrackingConsentVersion(
    { trackingPixels: { ymCounterId: "111111" }, trackingConsentVersion: 1 },
    { trackingPixels: { ymCounterId: "222222" } },
  );
  assert.equal(next.trackingConsentVersion, 2);
  assert.equal(hasQrConsent("1", 2), false);
  assert.equal(hasQrConsent("2", 2), true);
});

test("requiredConsentVersion stays 0 without pixels or a GDPR gate", () => {
  assert.equal(requiredConsentVersion({}), 0);
  assert.equal(requiredConsentVersion({ gdprRequired: true }), 1);
  assert.equal(requiredConsentVersion({ trackingPixels: { ga4Id: "G-ABC" } }), 1);
});

test("cookie name is per short code", () => {
  assert.equal(qrConsentCookieName("abc12"), "gdpr_qr_abc12");
});
