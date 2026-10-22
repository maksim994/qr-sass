import test from "node:test";
import assert from "node:assert/strict";
import { digestDateWindow, digestTitle, digestTotalsText } from "./email-digest-policy.ts";

test("manual digest validates Moscow calendar boundaries including leap days", () => {
  assert.deepEqual(digestDateWindow("2026-10-21"), {
    start: new Date("2026-10-20T21:00:00Z"), end: new Date("2026-10-21T21:00:00Z"),
  });
  assert.equal(digestDateWindow("2028-02-29").end.toISOString(), "2028-02-29T21:00:00.000Z");
  for (const day of ["2026-02-29", "2026-13-01", "2026-10-32", "21.10.2026"])
    assert.throws(() => digestDateWindow(day));
});
test("empty days explicitly contain zeroes; subjects identify the day and test", () => {
  const empty = digestTotalsText(0, 2, 0, 0);
  assert.match(empty, /Регистрации: 0/);
  assert.match(empty, /Оплаты: 0/);
  assert.match(empty, /За сутки регистраций и оплат не было/);
  assert.doesNotMatch(digestTotalsText(1, 0, 0, 0), /не было/);
  assert.doesNotMatch(digestTotalsText(0, 0, 1, 500), /не было/);
  assert.equal(digestTitle("2026-10-21", true), "[ТЕСТ] Сводка QR-S за 21.10.2026");
});
