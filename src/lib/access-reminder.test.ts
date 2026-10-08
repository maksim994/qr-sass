import assert from "node:assert/strict";
import { test } from "node:test";
import { accessReminder } from "./access-reminder.ts";
const now = new Date("2026-10-08T12:00:00Z"), day = 86400_000;
test("reminds before and shortly after expiry, never for unlimited or distant access", () => {
  assert.match(accessReminder("trial", new Date(now.getTime() + day), now)!.title, /Пробный/);
  assert.match(accessReminder("canceled", new Date(now.getTime() + day), now)!.title, /Платный/);
  assert.match(accessReminder("expired", new Date(now.getTime() - day), now)!.title, /завершён/);
  assert.equal(accessReminder("active", null, now), null);
  assert.equal(accessReminder("active", new Date(now.getTime() + 4 * day), now), null);
  assert.equal(accessReminder("expired", new Date(now.getTime() - 8 * day), now), null);
});
