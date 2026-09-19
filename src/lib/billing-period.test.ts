import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextPaidPeriodEnd, resolvePaidPlanId } from "./billing-period.ts";

describe("nextPaidPeriodEnd", () => {
  it("starts a month from now when there is no paid remainder", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, null, "trial");
    assert.equal(end.getTime(), new Date("2026-04-10T12:00:00.000Z").getTime());
  });

  it("stacks a second payment from the already extended paid end", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const first = nextPaidPeriodEnd(now, null, "trial");
    const second = nextPaidPeriodEnd(now, first, "active");
    assert.equal(first.getTime(), new Date("2026-04-10T12:00:00.000Z").getTime());
    assert.equal(second.getTime(), new Date("2026-05-10T12:00:00.000Z").getTime());
  });

  it("keeps unused time after cancel-at-period-end", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const paidUntil = new Date("2026-03-20T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, paidUntil, "canceled");
    assert.equal(end.getTime(), new Date("2026-04-20T12:00:00.000Z").getTime());
  });

  it("does not stack an expired period", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const expired = new Date("2026-03-01T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, expired, "active");
    assert.equal(end.getTime(), new Date("2026-04-10T12:00:00.000Z").getTime());
  });

  it("clamps 31 January to the last day of February", () => {
    const now = new Date("2026-01-31T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, null, "trial");
    assert.equal(end.toISOString(), "2026-02-28T12:00:00.000Z");
  });

  it("keeps 29 February on a leap year", () => {
    const now = new Date("2024-01-31T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, null, "free");
    assert.equal(end.toISOString(), "2024-02-29T12:00:00.000Z");
  });

  it("clamps 31 March to 30 April, not 1 May", () => {
    const paidUntil = new Date("2026-03-31T12:00:00.000Z");
    const now = new Date("2026-03-10T12:00:00.000Z");
    const end = nextPaidPeriodEnd(now, paidUntil, "active");
    assert.equal(end.toISOString(), "2026-04-30T12:00:00.000Z");
  });
});

describe("resolvePaidPlanId", () => {
  const prices = { PRO: 990, BUSINESS: 2990 };

  it("uses local planId when present", () => {
    assert.equal(resolvePaidPlanId({ localPlanId: "PRO", amountRub: 990, prices }), "PRO");
  });

  it("recovers plan from YooKassa metadata for legacy rows", () => {
    assert.equal(
      resolvePaidPlanId({ localPlanId: null, metadataPlanId: "BUSINESS", amountRub: 2990, prices }),
      "BUSINESS",
    );
  });

  it("recovers plan from checkout description", () => {
    assert.equal(
      resolvePaidPlanId({
        localPlanId: null,
        description: "Оплата тарифа PRO",
        amountRub: 990,
        prices,
      }),
      "PRO",
    );
  });

  it("rejects conflicting local and metadata plans", () => {
    assert.equal(
      resolvePaidPlanId({ localPlanId: "PRO", metadataPlanId: "BUSINESS", amountRub: 990, prices }),
      null,
    );
  });
});
