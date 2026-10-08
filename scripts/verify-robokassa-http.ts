import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.ts";

const base = process.env.ROBOKASSA_HTTP_TEST_URL ?? "http://localhost:3105";
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (base !== "http://localhost:3105" || !["127.0.0.1", "localhost"].includes(database.hostname) || database.pathname !== "/qr_robokassa_test") {
  throw new Error("HTTP verification requires the isolated localhost:3105 server and qr_robokassa_test database");
}
const db = getDb();
let checks = 0;
function passed(message: string) { checks += 1; process.stdout.write(`PASS ${message}\n`); }
try {
  const workspace = await db.workspace.create({ data: { name: "Robokassa HTTP", slug: `http-${crypto.randomUUID()}` } });
  const user = await db.user.upsert({ where: { email: "robokassa-ui@example.test" },
    create: { email: "robokassa-ui@example.test", passwordHash: await bcrypt.hash("SyntheticUiPassword123!", 10) }, update: {} });
  await db.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" } });
  const token = await new SignJWT({ sub: user.id, email: user.email, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h")
    .sign(new TextEncoder().encode("synthetic-build-jwt-secret-at-least-32-characters"));
  const headers = { Cookie: `qr_saas_session=${token}; qr_workspace_id=${workspace.id}; csrf_token=synthetic-csrf`,
    Origin: base, "X-CSRF-Token": "synthetic-csrf", "Content-Type": "application/json" };
  const body = JSON.stringify({ workspaceId: workspace.id, planId: "PRO", amount: 1 });
  assert.equal((await fetch(`${base}/api/billing/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 401);
  assert.equal((await fetch(`${base}/api/billing/checkout`, { method: "POST", headers: { ...headers, "X-CSRF-Token": "wrong" }, body })).status, 403);
  const unauthorizedWorkspace = JSON.stringify({ workspaceId: "not-a-member", planId: "PRO" });
  assert.equal((await fetch(`${base}/api/billing/checkout`, { method: "POST", headers, body: unauthorizedWorkspace })).status, 403);
  passed("checkout enforces session, workspace membership and browser CSRF");
  const response = await fetch(`${base}/api/billing/checkout`, { method: "POST", headers, body });
  assert.equal(response.status, 200);
  const checkout = (await response.json()).data;
  const fields = checkout.payment.fields;
  assert.equal(checkout.provider, "robokassa");
  assert.equal(fields.OutSum, "990.00");
  assert.equal(fields.IsTest, "1");
  const receipt = JSON.parse(decodeURIComponent(fields.Receipt));
  assert.equal(receipt.items[0].sum, 990);
  assert.match(receipt.items[0].name, /QR-S.ru.*1 месяц/);
  assert.equal(fields.SignatureValue, createHash("sha256").update(`isolated-shop:990.00:${fields.InvId}:${fields.Receipt}:synthetic-test-one:Shp_order=${checkout.paymentId}:Shp_test=1`).digest("hex"));
  assert.ok(!JSON.stringify(checkout).includes("synthetic-test"));
  passed("checkout uses server price, returns signed receipt and exposes no technical passwords");
  const params = new URLSearchParams({ OutSum: "990.000000", InvId: fields.InvId, Shp_order: checkout.paymentId, Shp_test: "1" });
  const sign = (p: URLSearchParams) => p.set("SignatureValue", createHash("sha256").update(`${p.get("OutSum")}:${p.get("InvId")}:synthetic-test-two:Shp_order=${checkout.paymentId}:Shp_test=1`).digest("hex"));
  sign(params);
  const callbackHeaders = { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://auth.robokassa.ru" };
  const changed = new URLSearchParams(params); changed.set("OutSum", "991.000000"); sign(changed);
  assert.equal((await fetch(`${base}/api/billing/webhook/robokassa`, { method: "POST", headers: callbackHeaders, body: changed })).status, 403);
  assert.equal((await fetch(`${base}/api/billing/webhook/robokassa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 400);
  assert.equal((await fetch(`${base}/api/billing/webhook/robokassa`, { method: "POST", headers: callbackHeaders, body: "x=" + "a".repeat(17000) })).status, 400);
  passed("callback rejects signed wrong amounts, unsupported content types and oversized bodies");
  const returnUrl = `${base}/api/billing/robokassa/return?Shp_order=${checkout.paymentId}&OutSum=990&InvId=${fields.InvId}`;
  const returned = await fetch(returnUrl, { redirect: "manual" });
  assert.equal(returned.status, 303);
  assert.equal(new URL(returned.headers.get("location")!).pathname, "/dashboard/billing");
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: checkout.paymentId } })).status, "PENDING");
  passed("browser return cannot confirm or cancel the order");
  const result = await fetch(`${base}/api/billing/webhook/robokassa`, { method: "POST", headers: callbackHeaders, body: params });
  assert.equal(result.status, 200); assert.equal(await result.text(), `OK${fields.InvId}`);
  const repeated = await fetch(`${base}/api/billing/webhook/robokassa?${params}`);
  assert.equal(repeated.status, 200); assert.equal(await repeated.text(), `OK${fields.InvId}`);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: checkout.paymentId } })).status, "SUCCEEDED");
  assert.equal(await db.subscription.count({ where: { workspaceId: workspace.id } }), 0);
  passed("GET and POST ResultURL acknowledgements confirm test order without granting access");
  const html = await fetch(`${base}/dashboard/billing?paymentId=${checkout.paymentId}`, { headers });
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Тестовая оплата подтверждена/);
  passed("authenticated billing page shows the database-confirmed test result");
  process.stdout.write(`${checks} HTTP checks passed\n`);
} finally { await db.$disconnect(); }
