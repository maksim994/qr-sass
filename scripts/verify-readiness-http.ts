import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";

// This runner writes synthetic fixtures. Never run it against a shared or live DB.
const base = "http://localhost:3108";
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
const jwtSecret = "synthetic-readiness-secret-at-least-32-characters";
const telegramToken = "synthetic-readiness-telegram-token";
if (database.hostname !== "127.0.0.1" || database.port !== "55438" || database.pathname !== "/qr_readiness") {
  throw new Error("Requires the isolated qr_readiness database on localhost:55438");
}
const db = getDb();
const run = randomUUID();
const userIds: string[] = [];
const workspaceIds: string[] = [];
let checks = 0;
function passed(message: string) { checks++; process.stdout.write(`PASS ${message}\n`); }
async function user(label: string) {
  const u = await db.user.create({ data: { email: `${label}-${run}@example.test`, passwordHash: "synthetic-unusable-password" } });
  userIds.push(u.id);
  return u;
}
async function workspace(slug: string, unlimited = true) {
  const ws = await db.workspace.create({ data: {
    name: "Readiness test", slug, plan: "PRO", accessMode: unlimited ? "friends" : "standard",
    ...(!unlimited ? { subscription: { create: { plan: "PRO", status: "active", currentPeriodEnd: new Date(Date.now() + 86400000) } } } : {}),
  } });
  workspaceIds.push(ws.id);
  return ws;
}
async function headers(u: Awaited<ReturnType<typeof user>>, workspaceId: string) {
  const token = await new SignJWT({ sub: u.id, email: u.email, sv: u.sessionVersion })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h")
    .sign(new TextEncoder().encode(jwtSecret));
  return { Cookie: `qr_saas_session=${token}; qr_workspace_id=${workspaceId}; csrf_token=readiness-csrf`,
    Origin: base, "X-CSRF-Token": "readiness-csrf", "Content-Type": "application/json" };
}
type Headers = Awaited<ReturnType<typeof headers>>;
function request(path: string, h: Headers, body: unknown, method = "POST") {
  return fetch(`${base}${path}`, { method, headers: h, ...(method !== "DELETE" ? { body: JSON.stringify(body) } : {}) });
}
try {
  const owner = await user("owner"), guest = await user("guest"), other = await user("other");
  const ws = await workspace(`readiness-${run}`);
  await db.membership.create({ data: { userId: owner.id, workspaceId: ws.id, role: "OWNER" } });
  const oh = await headers(owner, ws.id), gh = await headers(guest, ws.id), otherh = await headers(other, ws.id);
  const membersPath = `/api/workspaces/${ws.id}/members`;
  const invite = async (email: string) => {
    const r = await request(membersPath, oh, { email });
    assert.equal(r.status, 200);
    return (await r.json()).data.inviteId as string;
  };
  const respond = (id: string, h: Headers, action = "accept") => request(`/api/invites/${id}`, h, { action });
  assert.equal((await request(membersPath, otherh, { email: guest.email })).status, 401);
  assert.equal((await request(membersPath, { ...oh, "X-CSRF-Token": "wrong" }, { email: guest.email })).status, 403);
  assert.equal((await request(membersPath, oh, { email: 123 })).status, 400);
  passed("team mutations enforce membership, CSRF and input validation");

  const concurrent = await Promise.all([request(membersPath, oh, { email: guest.email }), request(membersPath, oh, { email: guest.email })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  const pendingId = (await concurrent.find(r => r.status === 200)!.json()).data.inviteId;
  assert.equal(await db.membership.count({ where: { workspaceId: ws.id, userId: guest.id } }), 0);
  assert.equal((await respond(pendingId, otherh)).status, 404);
  assert.equal((await respond(pendingId, gh, "decline")).status, 200);
  assert.equal(await db.membership.count({ where: { workspaceId: ws.id, userId: guest.id } }), 0);
  passed("concurrent invitations create one pending invite; only recipient can decline; no automatic access");

  const acceptedId = await invite(guest.email);
  assert.equal((await respond(acceptedId, gh)).status, 200);
  assert.equal((await respond(acceptedId, gh)).status, 409);
  assert.equal(await db.membership.count({ where: { workspaceId: ws.id, userId: guest.id } }), 1);
  passed("acceptance grants one membership; replay cannot grant access twice");

  const revokedId = await invite(other.email);
  assert.equal((await request(`/api/workspaces/${ws.id}/invites/${revokedId}`, otherh, null, "DELETE")).status, 401);
  assert.equal((await request(`/api/workspaces/${ws.id}/invites/${revokedId}`, oh, null, "DELETE")).status, 200);
  assert.equal((await respond(revokedId, otherh)).status, 409);
  const expiredId = await invite(other.email);
  await db.workspaceInvite.update({ where: { id: expiredId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await respond(expiredId, otherh)).status, 409);
  passed("revoked and expired invitations cannot grant access");

  const limited = await workspace(`limited-${run}`, false);
  await db.membership.createMany({ data: [owner, guest, other, await user("existing")].map((u, i) => ({ userId: u.id, workspaceId: limited.id, role: i === 0 ? "OWNER" : "MEMBER" })) });
  const lh = await headers(owner, limited.id), a = await user("seat-a"), b = await user("seat-b");
  const lastSeat = await Promise.all([a, b].map(u => request(`/api/workspaces/${limited.id}/members`, lh, { email: u.email })));
  assert.deepEqual(lastSeat.map(r => r.status).sort(), [200, 409]);
  assert.equal(await db.workspaceInvite.count({ where: { workspaceId: limited.id, status: "PENDING" } }), 1);
  passed("concurrent reservations cannot overbook the final PRO seat");

  const qr = await db.qrCode.create({ data: { workspaceId: ws.id, createdById: owner.id,
    kind: "DYNAMIC", contentType: "URL", name: "Printed fixture", shortCode: `printed-${run}`,
    encodedContent: `${base}/r/printed-${run}`, currentTargetUrl: "https://example.org/first",
    passwordHash: "synthetic-secret-hash", payload: { url: "https://example.org/first", gdprRequired: true, gdprPolicyUrl: "https://example.org/privacy" },
  } });
  for (const path of [`/api/qr?workspaceId=${ws.id}`, `/api/qr/${qr.id}`]) {
    const r = await fetch(`${base}${path}`, { headers: oh });
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(!text.includes("passwordHash") && !text.includes("synthetic-secret-hash"));
    assert.ok(text.includes('"passwordRequired":true'));
  }
  passed("QR list and detail never expose the stored password hash");

  for (const path of [`/api/qr/${qr.id}`, `/api/qr/${qr.id}/settings`]) {
    const body = path.endsWith("settings") ? { gdprPolicyUrl: "javascript:alert(1)" } : { payload: { gdprPolicyUrl: "javascript:alert(1)" } };
    assert.equal((await request(path, oh, body, "PATCH")).status, 400);
  }
  assert.equal((await request("/api/qr", oh, { workspaceId: ws.id, kind: "DYNAMIC", contentType: "URL", name: "Invalid", style: {}, payload: { url: "https://example.org/", gdprPolicyUrl: "//attacker.example.org" } })).status, 400);
  const gate = await fetch(`${base}/g/${qr.shortCode}?policy=${encodeURIComponent("https://attacker.example.org/injected")}`);
  assert.equal(gate.status, 200);
  const html = await gate.text();
  assert.match(html, /href="https:\/\/example.org\/privacy"/);
  assert.ok(!html.includes('href="https://attacker.example.org/injected"'));
  passed("policy writes reject unsafe links; query cannot replace the stored policy");

  assert.equal((await request(`/api/qr/${qr.id}/settings`, oh, { gdprPolicyUrl: null }, "PATCH")).status, 200);
  const unchanged = await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } });
  assert.equal(unchanged.shortCode, qr.shortCode);
  assert.equal(unchanged.encodedContent, qr.encodedContent);
  assert.equal(unchanged.currentTargetUrl, qr.currentTargetUrl);
  assert.equal(unchanged.passwordHash, qr.passwordHash);
  assert.equal("gdprPolicyUrl" in (unchanged.payload as object), false);
  passed("clearing policy preserves printed code, target and password protection");

  const teamPage = await fetch(`${base}/dashboard/team`, { headers: oh });
  assert.equal(teamPage.status, 200);
  assert.match(await teamPage.text(), /Пригласить участника/);
  const logout = await fetch(`${base}/api/auth/logout`, { headers: oh, redirect: "manual" });
  assert.equal(logout.status, 302);
  assert.equal(logout.headers.get("location"), `${base}/`);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
  passed("team interface renders and logout returns to public APP_URL with cleared session");

  // A signed Telegram identity must not take over an email account or claim fake success.
  const telegramId = 900000000 + Math.floor(Math.random() * 100000000);
  const collision = await db.user.create({ data: { email: `tg-${telegramId}@telegram.local`, passwordHash: "synthetic-local-password-hash" } });
  userIds.push(collision.id);
  const init = new URLSearchParams({ signature: "synthetic-provider-signature", auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: telegramId, first_name: "Fixture" }) });
  const dataCheck = [...init].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(telegramToken).digest();
  init.set("hash", createHmac("sha256", secret).update(dataCheck).digest("hex"));
  const auth = await request("/api/telegram/auth", oh, { initDataRaw: init.toString() });
  assert.equal(auth.status, 409);
  assert.equal((await auth.json()).ok, false);
  assert.ok(!auth.headers.get("set-cookie")?.includes("qr_saas_session="));
  passed("Telegram failure cannot claim successful authentication without a session");
  process.stdout.write(`${checks} HTTP checks passed\n`);
} finally {
  await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
}
