import assert from "node:assert/strict";
import { test } from "node:test";
import { toPublicQr } from "./qr-public-dto.ts";

test("public QR payload keeps the protection flag and drops the hash", () => {
  const stored = { id: "qr", name: "Визитка", shortCode: "printed-code", passwordHash: "$2a$10$secret" };
  const pub = toPublicQr(stored);
  assert.equal(pub.passwordRequired, true);
  assert.equal("passwordHash" in pub, false);
  assert.equal(pub.shortCode, "printed-code");
  assert.equal(stored.passwordHash, "$2a$10$secret");
  assert.equal(toPublicQr({ id: "open", passwordHash: null }).passwordRequired, false);
});
