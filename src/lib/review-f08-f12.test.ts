import assert from "node:assert/strict";
import { test } from "node:test";
import { canIssuePasswordReset } from "./password-reset.ts";
import { yandexConfirmsLocalEmail } from "./yandex-email.ts";
import { savedQrIdForDownload } from "./qr-download-gate.ts";

test("password recovery is allowed for unverified password accounts, not telegram-auth", () => {
  assert.equal(canIssuePasswordReset({ passwordHash: "hashed" }), true);
  assert.equal(canIssuePasswordReset({ passwordHash: "telegram-auth" }), false);
  assert.equal(canIssuePasswordReset(null), false);
});

test("Yandex linking does not verify a mismatched local email", () => {
  assert.equal(yandexConfirmsLocalEmail("same@example.com", "same@example.com"), true);
  assert.equal(yandexConfirmsLocalEmail("other@yandex.ru", "same@example.com"), false);
});

test("dirty editor does not bind a persisted download id", () => {
  assert.equal(savedQrIdForDownload("qr1", true), undefined);
  assert.equal(savedQrIdForDownload("qr1", false), "qr1");
});
