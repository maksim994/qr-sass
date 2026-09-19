import assert from "node:assert/strict";
import { test } from "node:test";
import { PLAN_DEFAULTS, PLAN_IDS, type PlanInfo } from "./plans.ts";
import { applyWorkspaceTerms, isComplimentary } from "./workspace-plan.ts";

const pro: PlanInfo = { id: "PRO", ...PLAN_DEFAULTS.PRO };
const free: PlanInfo = { id: "FREE", ...PLAN_DEFAULTS.FREE };
const archive = { accessMode: "archive", archivedPlan: { version: 1, plan: { ...pro, priceRub: 199 }, freePlan: free } };
test("archive keeps its price and limits when public plans change", () => {
  const plan = applyWorkspaceTerms(archive, { ...pro, priceRub: 5000, limits: { ...pro.limits, maxQrCodes: 2 } });
  assert.equal(plan.priceRub, 199);
  assert.equal(plan.limits.maxQrCodes, null);
  assert.match(plan.name, /архивный/);
  assert.equal(applyWorkspaceTerms(archive, free).id, "FREE");
});
test("corrupt or wrong-tier archives fail closed", () => {
  assert.throws(() => applyWorkspaceTerms({ accessMode: "archive", archivedPlan: {} }, pro));
  assert.throws(() => applyWorkspaceTerms(archive, { id: "BUSINESS", ...PLAN_DEFAULTS.BUSINESS }));
});
test("friends is free, unlimited and absent from the public catalog", () => {
  const plan = applyWorkspaceTerms({ accessMode: "friends" }, free);
  assert.equal(plan.name, "Для своих");
  assert.equal(plan.priceRub, 0);
  assert.equal(plan.limits.maxQrCodes, null);
  assert.equal(plan.limits.maxUsers, null);
  assert.equal(plan.limits.allowsDynamic, true);
  assert.equal(plan.limits.allowsAnalytics, true);
  assert.equal(plan.id, "BUSINESS");
  assert.deepEqual(PLAN_IDS, ["FREE", "PRO", "BUSINESS"]);
  assert.equal(isComplimentary({ accessMode: "friends", subscription: { status: "expired" } }), true);
  assert.equal(isComplimentary({ ...archive, plan: "PRO", subscription: { status: "expired" } }), false);
});
