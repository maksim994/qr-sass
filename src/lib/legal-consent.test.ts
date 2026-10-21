import assert from "node:assert/strict";
import { test } from "node:test";
import { registerSchema, registrationLegalSchema } from "./validation.ts";
import { LEGAL_VERSION } from "./legal-documents.ts";
import { legalReceipt, oauthStateHash } from "./legal-acceptance.ts";
import { legalSnapshot as previousLegalSnapshot } from "./legal-history/2026-10-01.ts";
import { parseCookieChoice } from "./cookie-consent.ts";
import { legalSnapshot } from "./legal-documents.ts";
import { legalSnapshot as beforePdChanges } from "./legal-history/2026-10-21.1.ts";

test("PD document update preserves terms, analytics text and prior receipt edition", () => {
  const before = beforePdChanges();
  const current = legalSnapshot();
  assert.notEqual(current.version, before.version);
  assert.notEqual(current.privacyVersion, before.privacyVersion);
  assert.deepEqual(current.terms, before.terms);
  const analytics = (snapshot: ReturnType<typeof legalSnapshot>) =>
    snapshot.privacy.filter(section => section.id?.startsWith("section-4"));
  assert.deepEqual(analytics(current), analytics(before));
  assert.equal(registrationLegalSchema.safeParse({
    termsAccepted: true, consent: true, legalVersion: before.version,
  }).success, false);
  for (const source of ["email", "yandex"] as const) {
    const receipt = legalReceipt(source);
    assert.equal(receipt.termsAccepted, true);
    assert.equal(receipt.dataConsent, true);
    assert.deepEqual(receipt.documents, current);
  }
});

test("registration requires two explicit confirmations and the displayed document version", () => {
  const valid = { termsAccepted: true, consent: true, legalVersion: LEGAL_VERSION };
  assert.equal(registrationLegalSchema.safeParse(valid).success, true);
  for (const bad of [{}, { ...valid, consent: false }, { ...valid, termsAccepted: false }, { ...valid, consent: "true" }, { ...valid, legalVersion: "old" }, { ...valid, legalVersion: previousLegalSnapshot().version }]) {
    assert.equal(registrationLegalSchema.safeParse(bad).success, false);
    assert.equal(registerSchema.safeParse({ name: "Test", email: "test@example.invalid", password: "test-password-123", ...bad }).success, false);
  }
});

test("new acceptance cannot alter a previous edition or another acceptance receipt", () => {
  const historicalBefore = JSON.stringify(previousLegalSnapshot());
  const first = legalReceipt("email");
  const untouched = legalReceipt("email");
  const expected = JSON.stringify(untouched.documents);
  const documents = first.documents as { terms: { paragraphs: string[] }[] };
  documents.terms[0].paragraphs[0] = "Changed receipt";
  assert.equal(JSON.stringify(legalReceipt("email").documents), expected);
  assert.equal(JSON.stringify(previousLegalSnapshot()), historicalBefore);
  assert.notEqual(previousLegalSnapshot().version, LEGAL_VERSION);
});

test("acceptance evidence includes the complete versioned text and original acceptance time", () => {
  const at = new Date("2026-09-20T10:00:00Z");
  const receipt = legalReceipt("yandex", at);
  assert.equal(receipt.acceptedAt, at);
  assert.equal(receipt.version, LEGAL_VERSION);
  assert.equal(receipt.source, "yandex");
  const snapshot = receipt.documents as Record<string, unknown>;
  assert.equal(snapshot.version, receipt.version);
  for (const key of ["terms", "privacy", "consent"]) assert.ok(Array.isArray(snapshot[key]) && snapshot[key].length > 0);
  assert.notEqual(oauthStateHash("first"), oauthStateHash("second"));
  assert.match(oauthStateHash("first"), /^[a-f0-9]{64}$/);
});

test("optional analytics permission expires and rejects old, malformed and future consent", () => {
  const now = Date.parse("2026-09-20T10:00:00Z");
  const value = { choice: "accepted", version: LEGAL_VERSION, at: now - 1000 };
  assert.equal(parseCookieChoice(JSON.stringify(value), now), "accepted");
  assert.equal(parseCookieChoice(JSON.stringify({ ...value, choice: "declined" }), now), "declined");
  for (const raw of [null, "accepted", "{", JSON.stringify({ ...value, version: "old" }), JSON.stringify({ ...value, at: now + 1 }), JSON.stringify({ ...value, at: now - 180 * 86400000 }), JSON.stringify({ ...value, choice: true })]) {
    assert.equal(parseCookieChoice(raw, now), "none");
  }
});

import { TERMS_SECTIONS as PREVIOUS_TERMS, CONSENT_SECTIONS as PREVIOUS_CONSENT, PRIVACY_SECTIONS as PREVIOUS_PRIVACY } from "./legal-history/2026-10-08.ts";
import { TERMS_SECTIONS as CURRENT_TERMS, CONSENT_SECTIONS as CURRENT_CONSENT, PRIVACY_SECTIONS as CURRENT_PRIVACY } from "./legal-history/2026-10-18.ts";
test("TZ01 only corrects the payment recipient in privacy; terms and consent are unchanged",()=>{
  assert.deepEqual(CURRENT_TERMS,PREVIOUS_TERMS);
  assert.deepEqual(CURRENT_CONSENT,PREVIOUS_CONSENT);
  assert.equal(JSON.stringify(CURRENT_PRIVACY),JSON.stringify(PREVIOUS_PRIVACY).replace("и ЮKassa при оплате","и Robokassa при оплате"));
});
