import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyticsWindow,
  fillDailySeries,
  formatGrowth,
  formatDeviceLabel,
  formatAnalyticsDayLabel,
  isBotDevice,
  parseAnalyticsDays,
  mskDateKey,
  mskMidnightUtc,
} from "./analytics-metrics.ts";

test("parseAnalyticsDays", () => {
  assert.equal(parseAnalyticsDays("30"), 30);
  assert.equal(parseAnalyticsDays("90"), 90);
  assert.equal(parseAnalyticsDays("15"), 7);
  assert.equal(parseAnalyticsDays(undefined), 7);
});

test("analyticsWindow uses Moscow calendar days including today", () => {
  const now = new Date("2026-09-18T01:30:00.000Z"); // 04:30 MSK 18 Sep
  const win = analyticsWindow(7, now);
  assert.equal(win.keys.length, 7);
  assert.equal(win.keys[6], "2026-09-18");
  assert.equal(win.keys[0], "2026-09-12");
  assert.equal(win.start.toISOString(), mskMidnightUtc("2026-09-12").toISOString());
  assert.equal(win.prevStart.toISOString(), mskMidnightUtc("2026-09-05").toISOString());
});

test("mskDateKey around UTC midnight is still the Moscow date", () => {
  assert.equal(mskDateKey(new Date("2026-09-17T21:30:00.000Z")), "2026-09-18");
  assert.equal(mskDateKey(new Date("2026-09-17T20:59:00.000Z")), "2026-09-17");
});

test("fillDailySeries does not drop days and does not cap rows", () => {
  const keys = analyticsWindow(7, new Date("2026-09-18T12:00:00+03:00")).keys;
  const filled = fillDailySeries(keys, [
    { day: new Date("2026-09-12T00:00:00.000Z"), count: 10 },
    { day: new Date("2026-09-18T00:00:00.000Z"), count: 3 },
  ]);
  assert.equal(filled.length, 7);
  assert.equal(filled[0]?.count, 10);
  assert.equal(filled[6]?.count, 3);
  assert.equal(filled[1]?.count, 0);
});

test("formatGrowth does not invent +100% from a zero baseline", () => {
  assert.equal(formatGrowth(12, 0), "нет базы для сравнения");
  assert.equal(formatGrowth(0, 0), "нет изменений");
  assert.equal(formatGrowth(12, 8), "+50%");
  assert.equal(formatGrowth(4, 8), "-50%");
});

test("device labels stay honest", () => {
  assert.equal(formatDeviceLabel("bot"), "Боты");
  assert.equal(formatDeviceLabel(""), "Неизвестно");
  assert.equal(isBotDevice("bot"), true);
  assert.equal(isBotDevice("mobile"), false);
});

test("MSK Friday label is Пт, not the previous UTC weekday", () => {
  assert.equal(formatAnalyticsDayLabel("2026-09-18", 7), "Пт");
});
