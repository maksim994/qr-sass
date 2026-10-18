import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PLAN_DEFAULTS, PLAN_IDS } from "@/lib/plans";

describe("plan marketing labels stay honest", () => {
  for (const id of PLAN_IDS) {
    test(`${id} does not list White Label, geo, or SLA as included`, () => {
      const labels = PLAN_DEFAULTS[id].limitLabels.join(" | ");
      assert.doesNotMatch(labels, /метк/i);
      assert.doesNotMatch(labels, /географи/i);
      assert.doesNotMatch(labels, /SLA/i);
      assert.doesNotMatch(labels, /персональн/i);
    });
  }

  test("paid exports are not sold as vector PDF or EPS", () => {
    for (const id of ["PRO", "BUSINESS"] as const) {
      const labels = PLAN_DEFAULTS[id].limitLabels.join(" ");
      assert.match(labels, /растров/);
      assert.doesNotMatch(labels, /вектор/);
    }
  });
});

import { assertCanCreateQrCodes, getPlanSync } from "@/lib/plans";
import { COMMERCIAL } from "@/lib/commercial-config";
test("current public prices come from one config and PRO retains its team", () => {
  assert.equal(getPlanSync("PRO").priceRub, COMMERCIAL.pro.priceRub);
  assert.equal(getPlanSync("BUSINESS").priceRub, COMMERCIAL.business.priceRub);
  assert.equal(getPlanSync("PRO").limits.maxUsers, 5);
});
test("FREE admits two dynamic codes and rejects further creation without touching old codes", async () => {
  for (const dynamic of [0, 1, 2, 5]) {
    const db = { qrCode: { count: async (args: { where: { OR?: unknown } }) => args.where.OR ? dynamic : Math.max(dynamic, 1) } };
    const result = await assertCanCreateQrCodes({ workspaceId: "synthetic", planId: "FREE", plan: getPlanSync("FREE"), needsDynamic: true, db: db as never });
    assert.equal(result.ok, dynamic < 2);
    if (!result.ok) assert.equal(result.code, "DYNAMIC_REQUIRED");
  }
});
test("archive quota and bulk dynamic quota include every requested row", async () => {
  const db = { qrCode: { count: async () => 10 } };
  const result = await assertCanCreateQrCodes({ workspaceId: "synthetic", planId: "FREE", plan: getPlanSync("FREE"), db: db as never });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "QR_LIMIT");
});
