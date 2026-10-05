import assert from "node:assert/strict";
import { test } from "node:test";
import { registerSchema, registrationLegalSchema } from "./validation.ts";
import { LEGAL_VERSION } from "./legal-documents.ts";
import { legalReceipt, oauthStateHash } from "./legal-acceptance.ts";
import { legalSnapshot as previousLegalSnapshot } from "./legal-history/2026-10-01.ts";
import { parseCookieChoice } from "./cookie-consent.ts";

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
