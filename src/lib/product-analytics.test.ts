import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGAL_VERSION } from "./legal-documents.ts";
import { PRODUCT_GOALS, trackGoal } from "./product-analytics.ts";
import { downloadQrFile } from "./download-qr-file.ts";

test("goals require current consent and a ready counter; payments cannot be forged by the client", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: unknown[][] = [];
  let choice = "declined";
  const fake = { __qrsYmId: "106988416", ym: (...args: unknown[]) => calls.push(args), localStorage: {
    getItem: () => JSON.stringify({ choice, version: LEGAL_VERSION, at: Date.now() }),
  } };
  Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
  try {
    assert.equal(trackGoal(PRODUCT_GOALS.trial_started), false);
    assert.equal(calls.length, 0);
    choice = "accepted";
    assert.equal(trackGoal(PRODUCT_GOALS.trial_started, { planId: "PRO" }), true);
    assert.deepEqual(calls, [["106988416", "reachGoal", "trial_started", { planId: "PRO" }]]);
    assert.equal(trackGoal(PRODUCT_GOALS.subscription_paid), false);
    assert.equal(calls.length, 1);
    fake.ym = () => { throw new Error("blocked"); };
    assert.equal(trackGoal(PRODUCT_GOALS.qr_created), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("failed downloads and HTML/JSON error responses do not count as received files", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response("error", { status: 403 }), new Response("<html>Login</html>", { headers: { "content-type": "text/html" } }), new Response('{}', { headers: { "content-type": "application/json" } }), new Response("")]) {
      globalThis.fetch = async () => response;
      await assert.rejects(downloadQrFile("/api/qr/test/download?format=png"));
    }
  } finally { globalThis.fetch = original; }
});
