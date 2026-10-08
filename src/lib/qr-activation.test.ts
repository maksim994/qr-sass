import assert from "node:assert/strict";
import { test } from "node:test";
import { activatedWorkspaces } from "./qr-activation.ts";
const qrs = [{ id: "s", kind: "STATIC", shortCode: null }, { id: "d", kind: "DYNAMIC", shortCode: "printed" }, { id: "v", kind: "STATIC", shortCode: "vcard" }];
const event = (qrCodeId: string, name: string) => ({ qrCodeId, name, workspaceId: "ws" });
test("independent static download activates without an impossible external scan", () => {
  assert.equal(activatedWorkspaces([event("s", "qr_created"), event("s", "qr_downloaded")], qrs).active.has("ws"), true);
});
test("managed QR and legacy hosted vCard require an external open of the same code", () => {
  for (const id of ["d", "v"]) {
    const events = [event(id, "qr_created"), event(id, "qr_downloaded")];
    assert.equal(activatedWorkspaces(events, qrs).active.size, 0);
    assert.equal(activatedWorkspaces([...events, event(id, "first_external_open")], qrs).active.has("ws"), true);
  }
});
test("events from different codes or deleted unknown codes do not produce a false activation", () => {
  assert.equal(activatedWorkspaces([event("d", "qr_created"), event("s", "qr_downloaded"), event("v", "first_external_open")], qrs).active.size, 0);
  assert.equal(activatedWorkspaces([event("missing", "qr_created"), event("missing", "qr_downloaded")], qrs).active.size, 0);
});
