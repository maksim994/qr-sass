import assert from "node:assert/strict";
import { test } from "node:test";
import { isReservedAuthEmail } from "./reserved-email.ts";

test("telegram identity namespace cannot be registered as a normal email", () => {
  assert.equal(isReservedAuthEmail("tg-1@telegram.local"), true);
  assert.equal(isReservedAuthEmail("  User@Telegram.Local "), true);
  assert.equal(isReservedAuthEmail("owner@example.com"), false);
});
