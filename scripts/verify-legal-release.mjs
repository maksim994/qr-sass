// Local integration check. Never use a production or restored customer database.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { LEGAL_VERSION } from "../src/lib/legal-documents.ts";
import { legalReceipt } from "../src/lib/legal-acceptance.ts";
import { MSG } from "../src/lib/user-messages.ts";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(["next/headers", "next/navigation", "next/server"].includes(specifier) ? specifier + ".js" : specifier, context);
} });
const { findOrCreateYandexUser } = await import("../src/lib/yandex-auth.ts");
const database = new URL(process.env.DATABASE_URL);
const base = process.env.LEGAL_TEST_ORIGIN || "http://localhost:3002";
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/qr_robokassa_release_test", "Dedicated synthetic test database required");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local server required");
assert.equal(process.env.TRUST_PROXY, "1", "Synthetic forwarded IPs require the local proxy fixture");
const db = new PrismaClient();
const suffix = Date.now().toString(36);
const email = `legal-release-${suffix}@example.invalid`;
const form = { name: "Release test", email, password: "Local-release-password-123", termsAccepted: true, consent: true, legalVersion: LEGAL_VERSION };
const cookieHeader = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
let headers;
let requestNumber = 0;
async function post(path, body, extraHeaders = {}) {
  return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `127.0.0.${++requestNumber}`, ...headers, ...extraHeaders }, body: JSON.stringify(body), redirect: "manual" });
}
try {
  // Only synthetic fixtures. No payment, email, Yandex or S3 request is made.
  await db.planOverride.upsert({ where: { planId: "PRO" }, create: { planId: "PRO", priceRub: 299 }, update: { priceRub: 299 } });
  await db.siteSettings.upsert({ where: { id: "default" }, create: { id: "default", contactEmail: "maksim994@yandex.ru" }, update: {} });
  const initial = await fetch(base + "/register");
  assert.equal(initial.status, 200);
  const initialCookies = cookieHeader(initial);
  const csrf = initialCookies.match(/(?:^|; )csrf_token=([^;]+)/)?.[1];
  assert.ok(csrf);
  headers = { Origin: base, Cookie: initialCookies, "x-csrf-token": csrf };
  const noCsrf = await post("/api/auth/register", form, { "x-csrf-token": "" });
  assert.equal(noCsrf.status, 403);
  for (const invalid of [{ ...form, consent: false }, { ...form, termsAccepted: false }, { ...form, legalVersion: "2026-10-04.1" }]) {
    assert.equal((await post("/api/auth/register", invalid)).status, 400);
    assert.equal(await db.user.count({ where: { email } }), 0);
  }
  assert.equal((await post("/api/auth/yandex", { ...form, consent: false })).status, 400);
  const registered = await post("/api/auth/register", form);
  assert.equal(registered.status, 200, "Valid registration failed");
  const user = await db.user.findUniqueOrThrow({ where: { email }, include: { legalAcceptances: true, memberships: true } });
  assert.equal(user.legalAcceptances.length, 1);
  assert.equal(user.legalAcceptances[0].version, LEGAL_VERSION);
  assert.equal(user.legalAcceptances[0].termsAccepted, true);
  assert.equal(user.legalAcceptances[0].dataConsent, true);
  assert.equal(user.legalAcceptances[0].documents.version, LEGAL_VERSION);
  const authCookies = initialCookies + "; " + cookieHeader(registered);
  assert.equal((await fetch(base + "/dashboard", { headers: { Cookie: authCookies }, redirect: "manual" })).status, 200);
  const billing = await fetch(base + "/dashboard/billing", { headers: { Cookie: authCookies } });
  assert.equal(billing.status, 200);
  const billingHtml = await billing.text();
  assert.match(billingHtml, /Попробовать 14 дней/);
  assert.match(billingHtml, /terms-of-service#payment/);
  assert.match(billingHtml, /terms-of-service#refund/);
  const oauth = await post("/api/auth/yandex", { termsAccepted: true, consent: true, legalVersion: LEGAL_VERSION, next: "/dashboard" });
  assert.equal(oauth.status, 200);
  const oauthBody = await oauth.json();
  assert.equal(new URL(oauthBody.data.url).origin, "https://oauth.yandex.ru");
  const oauthState = new URL(oauthBody.data.url).searchParams.get("state");
  const intent = await db.oAuthLegalIntent.findUniqueOrThrow({ where: { stateHash: createHash("sha256").update(oauthState).digest("hex") } });
  assert.equal(intent.version, LEGAL_VERSION);
  assert.ok(intent.expiresAt > new Date());
  const profile = { yandexId: `release-test-${suffix}`, email: `oauth-release-${suffix}@example.invalid`, name: "Local OAuth" };
  await assert.rejects(findOrCreateYandexUser(profile), new RegExp(MSG.YANDEX_REGISTRATION_REQUIRED));
  assert.equal(await db.user.count({ where: { email: profile.email } }), 0);
  const oauthUser = await findOrCreateYandexUser(profile, legalReceipt("yandex"));
  assert.equal(await db.legalAcceptance.count({ where: { userId: oauthUser.id, source: "yandex" } }), 1);
  assert.equal((await findOrCreateYandexUser(profile)).id, oauthUser.id);
  const login = await post("/api/auth/login", { email, password: form.password });
  assert.equal(login.status, 200);
  for (let i = 0; i < 3; i++) assert.equal((await post("/api/auth/register", { ...form, consent: false }, { "x-forwarded-for": "127.0.0.240" })).status, 400);
  assert.equal((await post("/api/auth/register", { ...form, consent: false }, { "x-forwarded-for": "127.0.0.240" })).status, 429);
  for (const path of ["/", "/terms-of-service", "/privacy-policy", "/personal-data-consent", "/register", "/register/yandex"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    if (["/terms-of-service", "/privacy-policy", "/personal-data-consent"].includes(path)) {
      assert.ok(html.includes(LEGAL_VERSION), path);
      assert.ok(html.includes("Люберцы, Московская область"), path);
    }
    if (path === "/terms-of-service") {
      assert.match(html, /id="payment"/);
      assert.match(html, /id="refund"/);
      assert.match(html, /14 дней/);
    }
    if (path === "/register/yandex") assert.match(html, /name="robots" content="noindex, nofollow"/);
  }
  console.log("PASS: CSRF, separate required consent, stale edition rejection, stored receipt, email login, authenticated billing links, 14-day trial, OAuth intent, new/existing OAuth user and public documents.");
} finally { await db.$disconnect(); }
