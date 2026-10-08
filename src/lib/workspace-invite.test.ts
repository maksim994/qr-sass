import assert from "node:assert/strict";
import { test } from "node:test";
import { inviteAcceptBlock, inviteCreateBlock, normalizeInviteEmail } from "./workspace-invite.ts";

test("invite does not occupy a seat until the person accepts", () => {
  assert.equal(normalizeInviteEmail("  Owner@Example.com "), "owner@example.com");
  assert.equal(
    inviteCreateBlock({
      alreadyMember: false,
      pendingInvite: false,
      memberCount: 1,
      pendingCount: 0,
      maxUsers: 5,
    }),
    null,
  );
  assert.equal(
    inviteCreateBlock({
      alreadyMember: true,
      pendingInvite: false,
      memberCount: 1,
      pendingCount: 0,
      maxUsers: 5,
    }),
    "already_member",
  );
  assert.equal(
    inviteCreateBlock({
      alreadyMember: false,
      pendingInvite: true,
      memberCount: 1,
      pendingCount: 1,
      maxUsers: 5,
    }),
    "already_invited",
  );
  assert.equal(
    inviteCreateBlock({
      alreadyMember: false,
      pendingInvite: false,
      memberCount: 4,
      pendingCount: 1,
      maxUsers: 5,
    }),
    "user_limit",
  );
});

test("only the invited account can accept a live invite", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const base = {
    status: "PENDING" as const,
    expiresAt: new Date("2026-10-01T12:00:00.000Z"),
    now,
    inviteEmail: "guest@example.com",
    actorEmail: "guest@example.com",
    memberCount: 1,
    maxUsers: 5,
  };
  assert.equal(inviteAcceptBlock(base), null);
  assert.equal(inviteAcceptBlock({ ...base, actorEmail: "other@example.com" }), "email_mismatch");
  assert.equal(inviteAcceptBlock({ ...base, status: "REVOKED" }), "not_pending");
  assert.equal(inviteAcceptBlock({ ...base, expiresAt: now }), "expired");
  assert.equal(inviteAcceptBlock({ ...base, memberCount: 5 }), "user_limit");
});
