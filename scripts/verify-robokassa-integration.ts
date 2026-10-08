import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// This script writes fixtures. It must never be pointed at production.
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(database.hostname) || database.pathname !== "/qr_robokassa_test") {
  throw new Error("Use an isolated localhost database named qr_robokassa_test");
}
Object.assign(process.env, {
  ROBOKASSA_MERCHANT_LOGIN: "isolated-shop", ROBOKASSA_HASH_ALGORITHM: "SHA256",
  ROBOKASSA_TEST_PASSWORD1: "synthetic-test-one", ROBOKASSA_TEST_PASSWORD2: "synthetic-test-two",
  ROBOKASSA_PASSWORD1: "synthetic-live-one", ROBOKASSA_PASSWORD2: "synthetic-live-two",
  ROBOKASSA_TEST_MODE: "true",
});
const { getDb } = await import("../src/lib/db.ts");
const { processRobokassaResult } = await import("../src/lib/robokassa-result.ts");
const { fulfillYookassaPayment } = await import("../src/lib/billing-apply.ts");
const { reconcilePendingPayments } = await import("../src/lib/billing-reconcile.ts");
const { newRobokassaInvoiceId } = await import("../src/lib/robokassa.ts");
const db = getDb();
const suffix = crypto.randomUUID();
let checks = 0;
function passed(name: string) { checks += 1; process.stdout.write(`PASS ${name}\n`); }
function signed(order: { id: string; providerPaymentId: string; amount: number; isTest: boolean }, overrides: Record<string,string> = {}, key?: string) {
  const params = new URLSearchParams({
    OutSum: `${order.amount}.000000`, InvId: order.providerPaymentId.split(":")[1],
    Shp_order: order.id, Shp_test: order.isTest ? "1" : "0", ...overrides,
  });
  const custom = [...params].filter(([k]) => k.startsWith("Shp_")).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${k}=${v}`);
  params.set("SignatureValue", createHash("sha256").update([
    params.get("OutSum"), params.get("InvId"), key ?? (order.isTest ? "synthetic-test-two" : "synthetic-live-two"), ...custom,
  ].join(":")).digest("hex"));
  return params;
}
try {
  const workspace = await db.workspace.create({ data: { name: "Isolated Robokassa test", slug: `robo-${suffix}` } });
  const user = await db.user.create({ data: { email: `robo-${suffix}@example.test`, passwordHash: "synthetic-disabled-login" } });
  await db.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" } });
  await db.qrCode.create({ data: { workspaceId: workspace.id, createdById: user.id,
    kind: "DYNAMIC", contentType: "URL", name: "Printed QR fixture", shortCode: `old-${suffix}`,
    encodedContent: `https://qr-s.ru/r/old-${suffix}`, currentTargetUrl: "https://example.test/destination",
    payload: { url: "https://example.test/destination" }, maxScans: 17,
  } });
  const qrBefore = await db.qrCode.findMany({ where: { workspaceId: workspace.id } });
  const legacy = await db.payment.create({ data: { workspaceId: workspace.id, providerPaymentId: `legacy-${suffix}`, amount: 990, planId: "PRO", status: "SUCCEEDED" } });
  // Simulate the previous release with a pre-existing paid order and printed QR.
  await db.$executeRawUnsafe('ALTER TABLE "Payment" DROP COLUMN "provider"');
  const migration = await readFile(new URL("../prisma/migrations/20261008120000_robokassa_provider/migration.sql", import.meta.url), "utf8");
  await db.$executeRawUnsafe(migration);
  await db.$executeRawUnsafe(migration);
  const migrated = await db.payment.findUniqueOrThrow({ where: { id: legacy.id } });
  assert.deepEqual(migrated, legacy);
  assert.deepEqual(await db.qrCode.findMany({ where: { workspaceId: workspace.id } }), qrBefore);
  passed("additive migration is repeatable and preserves existing payments and printed QR");
  const makeOrder = (isTest: boolean, status: "PENDING" | "CANCELED" = "PENDING") => db.payment.create({ data: {
    workspaceId: workspace.id, provider: "robokassa", providerPaymentId: `robokassa:${newRobokassaInvoiceId()}`,
    amount: 990, planId: "PRO", isTest, status,
  } });
  const first = await makeOrder(false);
  assert.equal((await processRobokassaResult(signed(first, { OutSum: "991.000000" }))).ok, false);
  assert.equal((await processRobokassaResult(signed(first, {}, "synthetic-test-two"))).ok, false);
  assert.equal(await db.subscription.count({ where: { workspaceId: workspace.id } }), 0);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: first.id } })).status, "PENDING");
  passed("signed wrong amounts and test keys cannot fulfill a live order");
  const firstResults = await Promise.all(Array.from({ length: 8 }, () => processRobokassaResult(signed(first))));
  assert.ok(firstResults.every(result => result.ok));
  const subscription = await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(subscription.plan, "PRO");
  assert.ok(subscription.currentPeriodEnd);
  assert.equal(await db.billingEvent.count({ where: { paymentId: first.id, type: "payment.applied" } }), 1);
  assert.equal(await db.businessEvent.count({ where: { paymentId: first.id } }), 1);
  assert.equal(await db.funnelEvent.count({ where: { paymentId: first.id, name: "payment_succeeded" } }), 1);
  passed("eight concurrent callbacks apply the paid month and conversion once");
  assert.equal((await processRobokassaResult(signed(first))).ok, true);
  assert.deepEqual(await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } }), subscription);
  passed("repeated callback acknowledges without extending the subscription");
  const test = await makeOrder(true);
  assert.equal((await processRobokassaResult(signed(test))).ok, true);
  assert.equal((await processRobokassaResult(signed(test))).ok, true);
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: test.id } })).status, "SUCCEEDED");
  assert.deepEqual(await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } }), subscription);
  assert.equal(await db.businessEvent.count({ where: { paymentId: test.id } }), 0);
  assert.equal(await db.funnelEvent.count({ where: { paymentId: test.id } }), 0);
  passed("test payment is recorded without changing access, revenue conversions or notifications");
  const late = await makeOrder(false, "CANCELED");
  assert.equal((await processRobokassaResult(signed(late))).ok, true);
  const renewed = await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.ok(renewed.currentPeriodEnd!.getTime() > subscription.currentPeriodEnd!.getTime());
  passed("late successful callback can recover a canceled order");
  const protectedOrder = await makeOrder(false);
  await db.payment.update({ where: { id: protectedOrder.id }, data: { status: "REFUNDED" } });
  assert.equal((await processRobokassaResult(signed(protectedOrder))).ok, true);
  assert.deepEqual(await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } }), renewed);
  passed("callback cannot revive a refunded payment");
  const savedFetch = globalThis.fetch;
  let externalCalls = 0;
  globalThis.fetch = async () => { externalCalls += 1; throw new Error("External requests forbidden in isolated test"); };
  try {
    const sync = await reconcilePendingPayments({ providerPaymentId: test.providerPaymentId });
    assert.equal(sync.results[0].reason, "robokassa_result_required");
    const forgedYoo = await fulfillYookassaPayment({ id: test.providerPaymentId, status: "succeeded", test: false, amount: { value: "990.00", currency: "RUB" } });
    assert.equal(forgedYoo.reason, "provider");
    assert.equal(externalCalls, 0);
  } finally { globalThis.fetch = savedFetch; }
  passed("Robokassa orders never enter YooKassa reconciliation or fulfillment");
  assert.deepEqual(await db.qrCode.findMany({ where: { workspaceId: workspace.id } }), qrBefore);
  passed("all payment scenarios preserve printed QR content and settings");
  process.stdout.write(`${checks} integration checks passed\n`);
} finally { await db.$disconnect(); }
