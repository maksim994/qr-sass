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
