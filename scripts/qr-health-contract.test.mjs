import assert from "node:assert/strict";
import { test } from "node:test";
import { compareSnapshots, qrContractHash } from "./qr-health-contract.mjs";

function snapshot() {
  return {
    version: 2, appUrl: "https://qr.example",
    totals: { qrCodes: 1, users: 1, workspaces: 1, scanEvents: 10 }, critical: [],
    qrCodes: [{ id: "existing", shortCode: "printed", kind: "DYNAMIC", contentType: "URL",
      workspaceId: "owner", isArchived: false, hasTarget: true,
      contractHash: qrContractHash({ currentTargetUrl: "https://example.com/original" }) }],
  };
}

test("new customers and scans do not break the release check", () => {
  const baseline = snapshot(); const current = snapshot();
  current.qrCodes.push({ ...current.qrCodes[0], id: "new", shortCode: "new" });
  current.totals = { qrCodes: 2, users: 2, workspaces: 2, scanEvents: 11 };
  assert.deepEqual(compareSnapshots(baseline, current).errors, []);
});

for (const [field, value] of Object.entries({ shortCode: "changed", kind: "STATIC", contentType: "PDF", workspaceId: "other", isArchived: true, hasTarget: false, contractHash: "changed" })) {
  test(`changing ${field} blocks release`, () => {
    const current = snapshot(); current.qrCodes[0][field] = value;
    assert.ok(compareSnapshots(snapshot(), current).errors.some((error) => error.includes(field)));
  });
}

test("replacement with equal QR count still detects lost printed code", () => {
  const current = snapshot(); current.qrCodes[0].id = "replacement";
  assert.equal(compareSnapshots(snapshot(), current).missing.length, 1);
  assert.ok(compareSnapshots(snapshot(), current).errors.length);
});

test("old snapshots, missing hashes, changed domain and critical flags fail closed", () => {
  for (const mutate of [s => delete s.version, s => delete s.qrCodes[0].contractHash,
    s => s.appUrl = "https://other.example", s => s.critical.push({ id: "bad" })]) {
    const current = snapshot(); mutate(current);
    assert.ok(compareSnapshots(snapshot(), current).errors.length);
  }
});

test("hash includes full URLs beyond report preview, payload and access settings", () => {
  const base = { currentTargetUrl: `https://example.com/${"x".repeat(140)}a`, payload: { fileUrl: "https://files.example/menu.pdf" } };
  for (const change of [ { currentTargetUrl: base.currentTargetUrl + "b" }, { payload: { fileUrl: "https://files.example/other.pdf" } },
    { encodedContent: "https://qr.example/r/changed" }, { maxScans: 1 }, { expireAt: new Date() }, { passwordHash: "new" } ]) {
    assert.notEqual(qrContractHash(base), qrContractHash({ ...base, ...change }));
  }
  assert.equal(qrContractHash({ payload: { a: 1, b: { c: 2, d: 3 } } }), qrContractHash({ payload: { b: { d: 3, c: 2 }, a: 1 } }));
});
