import assert from "node:assert/strict";
import { test } from "node:test";
import { canBindLegacyTelegram, telegramSubject } from "./telegram-identity-rules.ts";
test("Telegram subject is a positive safe integer owned by the provider", () => {
  assert.equal(telegramSubject(123456789), "123456789");
  for (const id of [0, -1, 1.2, "123", null, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => telegramSubject(id));
});
test("legacy Telegram binding requires the original verified provider-only account", () => {
  const user = { email: "tg-123@telegram.local", passwordHash: "telegram-auth", emailVerifiedAt: new Date() };
  assert.ok(canBindLegacyTelegram(user, "123"));
  assert.equal(canBindLegacyTelegram({ ...user, passwordHash: "$2b$12$local-password" }, "123"), false);
  assert.equal(canBindLegacyTelegram({ ...user, emailVerifiedAt: null }, "123"), false);
  assert.equal(canBindLegacyTelegram(user, "124"), false);
});
