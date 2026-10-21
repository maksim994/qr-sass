import test from "node:test";
import assert from "node:assert/strict";
import {
  canEmail,
  DAY_MS,
  digestWindow,
  periodNoticeStage,
  retryDelay,
  smtpErrorCode,
  permanentSmtpError,
} from "./email-notification-policy.ts";
test("period notices use exclusive windows, cover exact expiry, and skip stale history", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const end = (days: number) => new Date(now.getTime() + days * DAY_MS);
  assert.equal(periodNoticeStage(end(4), now, false), null);
  assert.equal(periodNoticeStage(end(3), now, false), 3);
  assert.equal(periodNoticeStage(end(1), now, false), 1);
  assert.equal(periodNoticeStage(end(0), now, false), 0);
  assert.equal(periodNoticeStage(end(-1), now, false), null);
  assert.equal(periodNoticeStage(end(2), now, true), null);
  assert.equal(periodNoticeStage(end(0.5), now, true), 1);
});
test("daily digest uses the previous Moscow calendar day and starts at 09:00 MSK", () => {
  const early = digestWindow(new Date("2026-10-21T05:59:59Z"));
  assert.equal(early.ready, false);
  const window = digestWindow(new Date("2026-10-21T06:00:00Z"));
  assert.equal(window.ready, true);
  assert.equal(window.start.toISOString(), "2026-10-19T21:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-10-20T21:00:00.000Z");
});
test("reserved auth addresses cannot receive email", () => {
  assert.equal(canEmail("123@telegram.local"), false);
  assert.equal(canEmail("bad"), false);
  assert.equal(canEmail("maksim994@yandex.ru"), true);
});
test("delivery backoff grows and logs never retain SMTP response or credential strings", () => {
  assert.equal(retryDelay(1), 60000);
  assert.equal(retryDelay(3), 1500000);
  assert.equal(retryDelay(8), 21600000);
  assert.equal(
    smtpErrorCode({
      message: "password=private",
      response: "private",
      code: "SECRET",
    }),
    "DELIVERY_ERROR",
  );
  assert.equal(smtpErrorCode({ responseCode: 550 }), "SMTP_550");
  assert.equal(permanentSmtpError({ responseCode: 550 }), true);
  assert.equal(permanentSmtpError({ responseCode: 451 }), false);
});
