import test from "node:test";
import assert from "node:assert/strict";
import { describeReconciliation } from "./admin-reconcile-result.ts";
test("missing provider response cannot be announced as success", () => {
  assert(describeReconciliation({ ok: false, reason: "provider_missing" }).error);
  assert(describeReconciliation(undefined).error);
});
test("cancellation and pending have distinct truthful status messages", () => {
  assert.match(describeReconciliation({ ok: true, reason: "canceled" }).notice!, /отмене/);
  assert.match(describeReconciliation({ ok: true, reason: "pending" }).notice!, /ожидает оплаты/);
});
test("failed fulfillment is not confused with already applied payment", () => {
  for (const reason of ["plan", "unmatched", "missing", "amount", "not_pending"]) assert(describeReconciliation({ ok: true, reason, applied: false }).error);
  assert(describeReconciliation({ ok: true, reason: "already_applied", applied: false }).notice);
  assert(describeReconciliation({ ok: true, reason: "applied", applied: true }).notice);
});
