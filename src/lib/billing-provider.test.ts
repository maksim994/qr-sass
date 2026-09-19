import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billingActionFromRemoteStatus } from "./billing-provider.ts";

describe("billingActionFromRemoteStatus", () => {
  it("applies a succeeded provider object even if the webhook event said canceled", () => {
    assert.equal(billingActionFromRemoteStatus("succeeded"), "succeed");
  });

  it("cancels only when the provider object itself is canceled", () => {
    assert.equal(billingActionFromRemoteStatus("canceled"), "cancel");
  });

  it("ignores pending and unknown provider statuses", () => {
    assert.equal(billingActionFromRemoteStatus("pending"), "ignore");
    assert.equal(billingActionFromRemoteStatus("waiting_for_capture"), "ignore");
    assert.equal(billingActionFromRemoteStatus(""), "ignore");
  });
});
