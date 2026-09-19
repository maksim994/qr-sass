import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateQrPublicAccess } from "./qr-public-access.ts";

const base = {
  id: "qr1",
  shortCode: "abc",
  isArchived: false,
  expireAt: null as Date | null,
  maxScans: null as number | null,
  passwordHash: null as string | null,
};

test("public access blocks archive, expiry, scan limit and password", async () => {
  assert.equal((await evaluateQrPublicAccess({ qr: null, scanCount: 0 })).reason, "missing");
  assert.equal((await evaluateQrPublicAccess({ qr: { ...base, isArchived: true }, scanCount: 0 })).reason, "archived");
  assert.equal(
    (await evaluateQrPublicAccess({
      qr: { ...base, expireAt: new Date("2020-01-01") },
      scanCount: 0,
      now: new Date("2026-09-18"),
    })).reason,
    "expired",
  );
  assert.equal((await evaluateQrPublicAccess({ qr: { ...base, maxScans: 2 }, scanCount: 2 })).reason, "limit");
  assert.equal((await evaluateQrPublicAccess({ qr: { ...base, maxScans: 1 }, scanCount: 0 })).ok, true);
  assert.equal((await evaluateQrPublicAccess({ qr: { ...base, passwordHash: "x" }, scanCount: 0 })).reason, "password");
  assert.equal((await evaluateQrPublicAccess({ qr: { ...base, passwordHash: "x" }, scanCount: 0, bypassPassword: true })).ok, true);
  assert.equal((await evaluateQrPublicAccess({ qr: base, scanCount: 0 })).ok, true);
});

test("view grant keeps media of the last allowed scan and blocks a new direct fetch", async () => {
  const { createQrViewGrant } = await import("./qr-view-grant.ts");
  const grant = await createQrViewGrant("qr1");
  const limited = { ...base, maxScans: 1 };
  assert.equal((await evaluateQrPublicAccess({ qr: limited, scanCount: 0 })).ok, true);
  assert.equal((await evaluateQrPublicAccess({ qr: limited, scanCount: 1 })).reason, "limit");
  assert.equal(
    (await evaluateQrPublicAccess({ qr: limited, scanCount: 1, requireViewGrant: true })).reason,
    "limit",
  );
  assert.equal(
    (await evaluateQrPublicAccess({
      qr: limited,
      scanCount: 1,
      requireViewGrant: true,
      viewGrantToken: grant,
    })).ok,
    true,
  );
  assert.equal(
    (await evaluateQrPublicAccess({
      qr: { ...limited, isArchived: true },
      scanCount: 1,
      requireViewGrant: true,
      viewGrantToken: grant,
    })).reason,
    "archived",
  );
});
