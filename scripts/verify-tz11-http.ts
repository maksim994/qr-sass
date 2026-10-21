import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";
import { LEGAL_VERSION } from "../src/lib/legal-documents.ts";
import { ANALYTICS_POLICY_VERSION } from "../src/lib/analytics-policy.ts";
import { recordBusinessEvent } from "../src/lib/business-events.ts";
import { legalReceipt, oauthStateHash } from "../src/lib/legal-acceptance.ts";
import { findOrCreateYandexUser } from "../src/lib/yandex-auth.ts";
import { signupSourceLabel, normalizeSignupSource } from "../src/lib/signup-source.ts";
const db = getDb(), base = "http://127.0.0.1:3016", run = randomUUID();
if (new URL(process.env.DATABASE_URL!).pathname !== "/qr_tz11_20261021") throw Error("Requires isolated local TZ11 database");
const checks: Record<string, unknown>[] = [];
const post = (path: string, body: unknown, cookie = "") => fetch(base + path, { method: "POST", headers: { cookie: `csrf_token=tz11; ${cookie}`, "x-csrf-token": "tz11", "content-type": "application/json", origin: base }, body: JSON.stringify(body) });
const read = async (r: Response) => { const b = await r.json(); assert.equal(r.status, 200, JSON.stringify(b)); return b.data; };
const signupSource = { utmSource: "test", utmMedium: "cpc", utmCampaign: "t1", utmContent: "banner", utmTerm: "qr", clickId: "synthetic-vk-click", clickIdType: "vkclid", referrer: "outside.example/path?token=remove#hash", landingPath: "/?utm_source=remove", firstTouchAt: new Date().toISOString() };
try {
  const partner = await db.partner.create({ data: { name: "TZ11 synthetic partner", code: `tz11-${run.slice(0, 8)}` } });
  const partnerResponse = await post("/api/referrals/visit", { code: partner.code, analyticsEnabled: true, policyVersion: ANALYTICS_POLICY_VERSION });
  assert.equal((await read(partnerResponse)).tracked, true);
  const partnerCookie = partnerResponse.headers.getSetCookie().find(v => v.startsWith("qrs_partner_visit="))!.split(";")[0];
  const response = await post("/api/auth/register", { name: "TZ11 Synthetic", email: `tz11-${run}@example.test`, password: `tz11-${run}`, consent: true, termsAccepted: true, legalVersion: LEGAL_VERSION, signupSource }, partnerCookie);
  const { userId } = await read(response);
  const cookie = response.headers.getSetCookie().find(v => v.startsWith("qr_saas_session="))!.split(";")[0];
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { signupSource: true, memberships: { include: { workspace: true } } } });
  assert.equal(signupSourceLabel(user.signupSource), "test/cpc/t1"); assert.equal(user.signupSource?.landingPath, "/"); assert.equal(user.signupSource?.referrer, "outside.example/path");
  assert.equal(user.memberships[0].workspace.partnerId, partner.id);
  checks.push({ check: "email registration stores all first-touch fields and existing partner attribution", ok: true });
  let receipt = await read(await post("/api/analytics/registration", { analytics: false, advertising: true }, `${cookie}; qrs_analytics_disabled=1`));
  assert.equal(receipt.registration, false); assert.equal(receipt.vkRegistration, true);
  receipt = await read(await post("/api/analytics/registration", { analytics: true, advertising: true }, cookie));
  assert.equal(receipt.registration, true); assert.equal(receipt.vkRegistration, false);
  receipt = await read(await post("/api/analytics/registration", { analytics: true, advertising: true }, cookie));
  assert.equal(receipt.registration, false); assert.equal(receipt.vkRegistration, false);
  checks.push({ check: "registration receipts independent, one per destination", ok: true });
  // A simulated confirmed local payment; no payment provider is contacted.
  const workspaceId = user.memberships[0].workspaceId;
  const subscription = await db.subscription.create({ data: { workspaceId, plan: "PRO", status: "active", currentPeriodEnd: new Date(Date.now() + 86400000) } });
  const payment = await db.payment.create({ data: { workspaceId, subscriptionId: subscription.id, provider: "robokassa", providerPaymentId: `tz11:${run}`, amount: 299, status: "SUCCEEDED", planId: "PRO", paidAt: new Date(), signupSourceUserId: userId, isTest: false } });
  const vkPayment = await read(await post("/api/analytics/payment", { paymentId: payment.id, analytics: false, advertising: true }, `${cookie}; qrs_analytics_disabled=1`));
  assert.equal(vkPayment.analytics, false); assert.equal(vkPayment.advertising, true); assert.equal(vkPayment.payment.revenue, 299);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).metrikaState, "PENDING");
  const ymPayment = await read(await post("/api/analytics/payment", { paymentId: payment.id, analytics: true, advertising: true }, cookie));
  assert.equal(ymPayment.analytics, true); assert.equal(ymPayment.advertising, false);
  assert.equal((await read(await post("/api/analytics/payment", { paymentId: payment.id, analytics: true, advertising: true }, cookie))).payment, null);
  checks.push({ check: "verified payment has independent VK/Metrika deduplication", ok: true });
  await db.telegramSettings.upsert({ where: { id: "default" }, create: { id: "default", enabled: true, tokenCipher: "synthetic-not-a-token", chatId: "synthetic-local-only" }, update: { enabled: true, tokenCipher: "synthetic-not-a-token", chatId: "synthetic-local-only" } });
  for (const name of ["registration_completed", "payment_succeeded"]) {
    const key = `tz11:${name}:${run}`;
    await db.$transaction(tx => recordBusinessEvent(tx, { key, name, ...(name === "registration_completed" ? { userId } : { paymentId: payment.id }), workspaceId, payload: { amount: 299 }, isTest: false }));
    const outbox = await db.notificationOutbox.findUniqueOrThrow({ where: { key: `event:${key}` } });
    assert.match(outbox.text, /Источник: test\/cpc\/t1/); assert.doesNotMatch(outbox.text, /synthetic-vk-click|utmContent/);
  }
  await db.telegramSettings.update({ where: { id: "default" }, data: { enabled: false } });
  checks.push({ check: "real notification builder adds registration source for signup and payment; no Telegram requests", ok: true });
  const admin = await db.user.create({ data: { email: `tz11-admin-${run}@example.test`, passwordHash: "synthetic", isAdmin: true } });
  const adminToken = await new SignJWT({ sub: admin.id, email: admin.email, sv: 0 }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const adminCookie = `qr_saas_session=${adminToken}`;
  const card = await fetch(`${base}/admin/users/${userId}`, { headers: { cookie: adminCookie } }); assert.equal(card.status, 200); const html = await card.text(); assert.match(html, /test\/cpc\/t1/); assert.match(html, /utm_content/);
  const oldCard = await fetch(`${base}/admin/users/tz11-legacy-user`, { headers: { cookie: adminCookie } }); assert.match(await oldCard.text(), /нет данных/);
  checks.push({ check: "admin source fields rendered and old user has no data", ok: true });
  const sourceFree = await post("/api/auth/register", { name: "TZ11 Referrer", email: `tz11-ref-${run}@example.test`, password: `tz11-${run}`, consent: true, termsAccepted: true, legalVersion: LEGAL_VERSION });
  const direct = await read(sourceFree); assert.equal(signupSourceLabel(await db.userSignupSource.findUnique({ where: { userId: direct.userId } })), "прямой заход");
  // OAuth intent stores only on our server, not in the URL sent to Yandex.
  const oauthResponse = await post("/api/auth/yandex", { consent: true, termsAccepted: true, legalVersion: LEGAL_VERSION, signupSource });
  const oauth = await read(oauthResponse), url = new URL(oauth.url);
  assert.ok(!oauth.url.includes("synthetic-vk-click") && !oauth.url.includes("utm"));
  const intent = await db.oAuthLegalIntent.findUniqueOrThrow({ where: { stateHash: oauthStateHash(url.searchParams.get("state")!) } });
  const source = normalizeSignupSource(intent.signupSource, base)!;
  const yandexUser = await findOrCreateYandexUser({ yandexId: `tz11-${run}`, email: `tz11-yandex-${run}@example.test`, name: "TZ11 Yandex" }, legalReceipt("yandex", intent.acceptedAt), source);
  assert.equal(signupSourceLabel(await db.userSignupSource.findUnique({ where: { userId: yandexUser.id } })), "test/cpc/t1");
  checks.push({ check: "Yandex POST persists source in OAuth intent; real creation function stores it, external OAuth not contacted", ok: true });
  for (const slug of ["tz11-old-0", "tz11-old-1", "tz11-old-2"]) {
    const r = await fetch(`${base}/r/${slug}`, { redirect: "manual", headers: { "user-agent": "TZ11-local-synthetic-test" } });
    assert.equal(r.status, 307); assert.equal(r.headers.get("location"), "https://example.org/tz11"); assert.doesNotMatch(await r.text(), /mc.yandex|top-fwz1|tmr-code/);
  }
  checks.push({ check: "three synthetic legacy redirects unchanged, server-only; no production QR links opened", ok: true });
  assert.equal(await db.qrCode.count({ where: { id: { startsWith: "tz11-legacy-qr-" } } }), 40);
  writeFileSync('outputs/tz11-complete/http-results.json', JSON.stringify(checks, null, 2));
  // Test-only browser proxy consumes these synthetic session values; never commit them.
  writeFileSync('/Users/mvmolkov/.codex/tmp/qr-tz11-20261021/browser-fixture.json', JSON.stringify({ adminCookie, userId, paymentId: payment.id }), { mode: 0o600 });
  console.log(JSON.stringify(checks));
} finally { await db.telegramSettings.updateMany({ data: { enabled: false } }); await db.$disconnect(); }
