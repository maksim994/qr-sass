import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMetrikaAttribution, paymentConversionCsv } from "./metrika-attribution.ts";
import { LEGAL_VERSION } from "./legal-documents.ts";
import { uploadMetrikaConversion } from "./metrika-upload.ts";

test("attribution rejects foreign counters, malformed IDs and stale consent", () => {
  const valid = { clientId: "1234567890123456789", counterId: "106988416", consentVersion: LEGAL_VERSION };
  assert.deepEqual(parseMetrikaAttribution(valid, "106988416"), valid);
  for (const input of [null, { ...valid, clientId: "1\n2" }, { ...valid, counterId: "999" }, { ...valid, consentVersion: "old" }]) assert.equal(parseMetrikaAttribution(input, "106988416"), null);
});

test("conversion payload uses paid time and real money, with no customer or workspace data", () => {
  assert.equal(paymentConversionCsv({ clientId: "123", paidAt: new Date("2026-09-30T00:00:00Z"), amount: 990, currency: "RUB" }), "ClientId,Target,DateTime,Price,Currency\n123,payment_succeeded,1790726400,990.00,RUB\n");
  assert.throws(() => paymentConversionCsv({ clientId: "=formula", paidAt: new Date(), amount: 990, currency: "RUB" }));
});

test("uploader distinguishes acceptance, definite rejection and ambiguous outcome", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /counter\/106988416\/offline_conversions\/upload/);
      assert.equal((init?.headers as Record<string, string>).Authorization, "OAuth test-token");
      assert.ok(init?.body instanceof FormData);
      return Response.json({ uploading: { id: 123 } });
    };
    assert.deepEqual(await uploadMetrikaConversion("106988416", "test-token", "csv", "payment1"), { state: "UPLOADED", uploadId: "123" });
    for (const code of [401, 403, 429]) {
      globalThis.fetch = async () => new Response("", { status: code });
      assert.equal((await uploadMetrikaConversion("106988416", "test", "csv", "p")).state, "PENDING");
    }
    for (const response of [new Response("", { status: 500 }), Response.json({}), Response.json({ uploading: { id: "bad" } })]) {
      globalThis.fetch = async () => response;
      assert.equal((await uploadMetrikaConversion("106988416", "test", "csv", "p")).state, "REVIEW");
    }
    globalThis.fetch = async () => { throw new Error("timeout"); };
    assert.equal((await uploadMetrikaConversion("106988416", "test", "csv", "p")).state, "REVIEW");
  } finally { globalThis.fetch = original; }
});
