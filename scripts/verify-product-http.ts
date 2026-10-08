import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";
import { LEGAL_VERSION } from "../src/lib/legal-documents.ts";
import { PARTNER_COOKIE } from "../src/lib/partner-rules.ts";
import { processMetrikaPayments } from "../src/lib/metrika-worker.ts";
import { workspaceActivation } from "../src/lib/funnel.ts";
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "55438" || database.pathname !== "/qr_readiness") throw new Error("Requires isolated qr_readiness DB on localhost:55438");
const db = getDb(), run = randomUUID(), base = "http://localhost:3108", users: string[] = [], spaces: string[] = [], partners: string[] = [];
let checks = 0;
const pass = (message: string) => { checks++; console.log(`PASS ${message}`); };
const headers = (cookie = "") => ({ Cookie: `csrf_token=product-test; ${cookie}`, Origin: base, "X-CSRF-Token": "product-test", "Content-Type": "application/json" });
const post = (path: string, body: unknown, cookie = "", method = "POST", extra = {}) => fetch(base + path, { method, headers: { ...headers(cookie), ...extra }, body: JSON.stringify(body) });
async function identity(admin = false) {
  const u = await db.user.create({ data: { email: `${admin ? "admin" : "user"}-${run}@example.test`, passwordHash: "synthetic-only", isAdmin: admin, metrikaRegistrationPending: true } }); users.push(u.id);
  const token = await new SignJWT({ sub: u.id, email: u.email, sv: u.sessionVersion }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("synthetic-readiness-secret-at-least-32-characters"));
  return { ...u, cookie: `qr_saas_session=${token}` };
}
try {
  const actor = await identity(), admin = await identity(true);
  const ws = await db.workspace.create({ data: { name: "Synthetic product check", slug: `product-${run}`, memberships: { create: { userId: actor.id, role: "OWNER" } } } }); spaces.push(ws.id);
  const trial = await post("/api/billing/trial", { workspaceId: ws.id }, actor.cookie); assert.equal(trial.status, 200, await trial.clone().text());
  const started = await db.workspace.findUniqueOrThrow({ where: { id: ws.id }, include: { subscription: true } });
  assert.equal(started.subscription!.currentPeriodEnd.getTime() - started.trialUsedAt!.getTime(), 7 * 86400_000);
  assert.equal((await post("/api/billing/trial", { workspaceId: ws.id }, actor.cookie)).status, 409);
  const oldEnd = new Date(Date.now() + 14 * 86400_000);
  await db.subscription.update({ where: { workspaceId: ws.id }, data: { currentPeriodEnd: oldEnd } });
  assert.equal((await post("/api/billing/trial", { workspaceId: ws.id }, actor.cookie)).status, 409);
  assert.equal((await db.subscription.findUniqueOrThrow({ where: { workspaceId: ws.id } })).currentPeriodEnd.getTime(), oldEnd.getTime());
  pass("new trial is exactly 7 days; repeats rejected; historical 14-day end preserved");
  assert.equal((await post("/api/admin/partners", { name: "No permission", code: "denied" }, actor.cookie)).status, 403);
  const code = `pilot-${run.slice(0, 8)}`;
  const created = await post("/api/admin/partners", { name: "Synthetic pilot", code }, admin.cookie); assert.equal(created.status, 201);
  const partner = (await created.json()).data; partners.push(partner.id);
  const second = await db.partner.create({ data: { name: "Second synthetic", code: `next-${run.slice(0, 8)}` } }); partners.push(second.id);
  assert.equal((await post("/api/referrals/visit", { code, consent: false, consentVersion: LEGAL_VERSION })).status, 400);
  const visit = await post("/api/referrals/visit", { code, consent: true, consentVersion: LEGAL_VERSION }); assert.equal(visit.status, 200);
  const visitCookie = visit.headers.get("set-cookie")!.match(/qrs_partner_visit=([^;]+)/)![0];
  await post("/api/referrals/visit", { code: second.code, consent: true, consentVersion: LEGAL_VERSION }, visitCookie);
  assert.equal(await db.partnerVisit.count({ where: { partnerId: second.id } }), 0);
  const registeredEmail = `registration-${run}@example.test`;
  const registered = await post("/api/auth/register", { name: "Synthetic", email: registeredEmail, password: "Synthetic-Qr-2026!", workspaceName: "Synthetic partner trial", termsAccepted: true, consent: true, legalVersion: LEGAL_VERSION }, visitCookie);
  assert.equal(registered.status, 200, await registered.clone().text());
  const registeredId = (await registered.json()).data.userId; users.push(registeredId);
  const owned = await db.workspace.findFirstOrThrow({ where: { memberships: { some: { userId: registeredId } } } }); spaces.push(owned.id);
  assert.equal(owned.partnerId, partner.id);
  const bot = await post("/api/referrals/visit", { code: second.code, consent: true, consentVersion: LEGAL_VERSION }, "", "POST", { "User-Agent": "TestCrawler" }); assert.equal((await bot.json()).data.tracked, false);
  await post("/api/admin/partners", { id: second.id, enabled: false }, admin.cookie, "PATCH");
  assert.equal((await (await post("/api/referrals/visit", { code: second.code, consent: true, consentVersion: LEGAL_VERSION })).json()).data.tracked, false);
  pass("partners are admin-only, require consent, keep first touch through registration and ignore bots/paused links");
  const receipt = await Promise.all([1, 2].map(() => post("/api/analytics/registration", {}, actor.cookie)));
  assert.deepEqual((await Promise.all(receipt.map(r => r.json()))).map(r => r.data.registration).sort(), [false, true]);
  pass("registration analytics receipt is claimed once under concurrent requests");
  const qr = await db.qrCode.create({ data: { workspaceId: ws.id, createdById: actor.id, name: "Synthetic activation", kind: "STATIC", contentType: "TEXT", payload: { text: "test", staticDirect: true }, styleConfig: {}, encodedContent: "test" } });
  await db.funnelEvent.createMany({ data: ["qr_created", "qr_downloaded"].map(name => ({ name, workspaceId: ws.id, qrCodeId: qr.id, isTest: false })) });
  assert.equal((await workspaceActivation(ws.id)).activated, true);
  assert.equal((await workspaceActivation(ws.id)).hasStaticDownload, true);
  await db.qrCode.update({ where: { id: qr.id }, data: { kind: "DYNAMIC", shortCode: `synthetic-${run}` } });
  assert.equal((await workspaceActivation(ws.id)).activated, false);
  await db.funnelEvent.create({ data: { name: "first_external_open", workspaceId: ws.id, qrCodeId: qr.id, isTest: false } });
  assert.equal((await workspaceActivation(ws.id)).activated, true);
  pass("stored static download activates without a scan; managed QR requires its external open");
  const payment = await db.payment.create({ data: { workspaceId: ws.id, providerPaymentId: `synthetic:${run}`, amount: 199, status: "SUCCEEDED", isTest: false, paidAt: new Date(), metrikaClientId: "123456789", metrikaCounterId: "106988416", metrikaConsentAt: new Date(), metrikaConsentVersion: LEGAL_VERSION, metrikaUserId: actor.id } });
  const originalFetch = globalThis.fetch; let uploads = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).startsWith("https://api-metrika.yandex.net/")) throw new Error("Only the stubbed Metrika endpoint is permitted");
    if (init?.method === "POST") { uploads++; assert.match(await ((init.body as FormData).get("file") as Blob).text(), /123456789,payment_succeeded,/); return Response.json({ uploading: { id: 987654321 } }); }
    return Response.json({ uploading: { status: "PROCESSED" } });
  }) as typeof fetch;
  try {
    await Promise.all([processMetrikaPayments(db, "synthetic"), processMetrikaPayments(db, "synthetic")]); assert.equal(uploads, 1);
    assert.ok(["UPLOADED", "PROCESSED"].includes((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).metrikaState));
    await processMetrikaPayments(db, "synthetic");
    const result = await db.payment.findUniqueOrThrow({ where: { id: payment.id } }); assert.equal(result.metrikaState, "PROCESSED"); assert.equal(result.metrikaClientId, null);
  } finally { globalThis.fetch = originalFetch; }
  pass("offline conversion is uploaded once under competing workers; processed ClientID is erased (external API stub)");
  await db.payment.update({ where: { id: payment.id }, data: { metrikaState: "PENDING", metrikaClientId: "123456789" } });
  const revoke = await post("/api/analytics/revoke", {}, `${actor.cookie}; ${visitCookie}`); assert.equal(revoke.status, 200);
  const revoked = await db.payment.findUniqueOrThrow({ where: { id: payment.id } }); assert.equal(revoked.metrikaState, "REVOKED"); assert.equal(revoked.metrikaClientId, null); assert.match(revoke.headers.get("set-cookie")!, new RegExp(PARTNER_COOKIE + "="));
  pass("consent withdrawal deletes partner cookie and pending conversion ClientID");
  const tooLarge = await fetch(base + "/api/upload", { method: "POST", headers: { ...headers(actor.cookie), "content-type": "multipart/form-data; boundary=abc", "content-length": "11075585" }, body: new Uint8Array(11075585) });
  assert.equal(tooLarge.status, 413);
  pass("oversized upload is rejected before S3 or database storage");
  console.log(`${checks} product HTTP checks passed`);
} finally {
  await db.workspace.deleteMany({ where: { id: { in: spaces } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.partnerVisit.deleteMany({ where: { partnerId: { in: partners } } });
  await db.partner.deleteMany({ where: { id: { in: partners } } });
  await db.$disconnect();
}
