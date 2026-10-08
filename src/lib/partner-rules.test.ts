import assert from "node:assert/strict";
import { test } from "node:test";
import { partnerCreateSchema, eligiblePartnerVisit, summarizePartnerPayments, PARTNER_WINDOW_MS } from "./partner-rules.ts";

test("partner codes are normalized and cannot contain URLs or query injection", () => {
  assert.deepEqual(partnerCreateSchema.parse({ name: " Channel ", code: " Author-1 " }), { name: "Channel", code: "author-1" });
  for (const code of ["aa", "a&ref=b", "https://site.ru", "русский", "_abc", "a".repeat(41)]) assert.equal(partnerCreateSchema.safeParse({ name: "Partner", code }).success, false);
});
test("attribution requires an active partner and an unexpired 30-day window", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  assert.equal(PARTNER_WINDOW_MS, 30 * 86400_000);
  assert.equal(eligiblePartnerVisit(null, now), false);
  assert.equal(eligiblePartnerVisit({ expiresAt: now, partner: { enabled: true } }, now), false);
  assert.equal(eligiblePartnerVisit({ expiresAt: new Date(now.getTime()+1), partner: { enabled: true } }, now), true);
  assert.equal(eligiblePartnerVisit({ expiresAt: new Date(now.getTime()+1), partner: { enabled: false } }, now), false);
});
test("first payments are per workspace; refunds remain distinct from renewals and net revenue", () => {
  const p = (workspaceId: string, status: string, amount: number, day: number, currency="RUB") => ({ workspaceId, status, amount, currency, paidAt: new Date(`2026-09-${day}T00:00:00Z`) });
  assert.deepEqual(summarizePartnerPayments([
    p("a","SUCCEEDED",990,20), p("b","SUCCEEDED",2990,10), p("a","REFUNDED",990,10), p("c","PENDING",990,11),
  ]), { firstPayments: 2, renewals: 1, grossRub: 4970, refundedRub: 990, netRub: 3980 });
  assert.equal(summarizePartnerPayments([p("d","SUCCEEDED",99,10,"USD")]).grossRub, 0);
  assert.deepEqual(summarizePartnerPayments([]), { firstPayments: 0, renewals: 0, grossRub: 0, refundedRub: 0, netRub: 0 });
});
