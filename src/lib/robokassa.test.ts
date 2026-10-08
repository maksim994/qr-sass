import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildRobokassaPayment, newRobokassaInvoiceId, robokassaAmountKopecks, verifyRobokassaResult, type RobokassaConfig } from "./robokassa.ts";

const config: RobokassaConfig = { merchantLogin: "demo", password1: "password_1", password2: "password_2", algorithm: "MD5", isTest: true };
const order = { id: "order-123", provider: "robokassa", providerPaymentId: "robokassa:12345", amount: 990, currency: "RUB", isTest: true };
function callback(overrides: Record<string, string> = {}, key = config.password2) {
  const p = new URLSearchParams({ OutSum: "990.000000", InvId: "12345", Shp_order: order.id, Shp_test: "1", ...overrides });
  const custom = [...p].filter(([k]) => k.startsWith("Shp_")).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${k}=${v}`);
  p.set("SignatureValue", createHash("md5").update([p.get("OutSum"), p.get("InvId"), key, ...custom].join(":")).digest("hex").toUpperCase());
  return p;
}

describe("Robokassa signed payment and receipt", () => {
  it("matches the documented encoded Receipt signature and round-trips through POST", () => {
    const payment = buildRobokassaPayment({ invoiceId: "12345", orderId: order.id, amount: 990, name: "Доступ к QR-S.ru: тариф Про, 1 месяц", email: "buyer@example.test" }, config);
    const fields = new URLSearchParams(payment.fields);
    const receipt = fields.get("Receipt")!;
    assert.deepEqual(JSON.parse(decodeURIComponent(receipt)), { items: [{ name: "Доступ к QR-S.ru: тариф Про, 1 месяц", quantity: 1, sum: 990, tax: "none", payment_object: "service" }] });
    const expected = createHash("md5").update(`demo:990.00:12345:${receipt}:password_1:Shp_order=order-123:Shp_test=1`).digest("hex");
    assert.equal(payment.fields.SignatureValue, expected);
    assert.equal(new URLSearchParams(fields.toString()).get("Receipt"), receipt);
    assert.equal(payment.fields.IsTest, "1");
  });
  it("supports the selected SHA algorithm", () => {
    const payment = buildRobokassaPayment({ invoiceId: "12345", orderId: order.id, amount: 990, name: "Про", email: "buyer@example.test" }, { ...config, algorithm: "SHA256", isTest: false });
    assert.equal(payment.fields.IsTest, "0");
    assert.equal(payment.fields.SignatureValue.length, 64);
    assert.equal(payment.fields.Shp_test, "0");
  });
  it("keeps invoice IDs precise and in the documented range", () => {
    const invoices = new Set(Array.from({ length: 100 }, newRobokassaInvoiceId));
    assert.equal(invoices.size, 100);
    for (const invoice of invoices) assert.ok(BigInt(invoice) > BigInt(0) && BigInt(invoice) <= BigInt("9223372036854775807"));
    assert.throws(() => buildRobokassaPayment({ invoiceId: "9223372036854775808", orderId: order.id, amount: 990, name: "Про", email: "a@b.test" }, config));
  });
  it("rejects invalid amounts and receipt names", () => {
    for (const amount of [0, -1, NaN, Infinity, 990.01]) assert.throws(() => buildRobokassaPayment({ invoiceId: "1", orderId: order.id, amount, name: "Про", email: "a@b.test" }, config));
  });
});

describe("Robokassa ResultURL verification", () => {
  it("accepts case-insensitive hashes and six-decimal RUB amounts", () => assert.equal(verifyRobokassaResult(callback(), order, config), true));
  it("rejects signed notifications for another amount, invoice, order or mode", () => {
    for (const overrides of [{ OutSum: "989.000000" }, { InvId: "12346" }, { Shp_order: "other" }, { Shp_test: "0" }]) {
      assert.equal(verifyRobokassaResult(callback(overrides), order, config), false);
    }
  });
  it("rejects missing or malformed signatures and duplicate parameters", () => {
    for (const value of ["", "not-hex", "a".repeat(32)]) {
      const p = callback(); p.set("SignatureValue", value);
      assert.equal(verifyRobokassaResult(p, order, config), false);
    }
    const p = callback(); p.append("OutSum", "990");
    assert.equal(verifyRobokassaResult(p, order, config), false);
  });
  it("cannot confirm a live order with test keys or the checkout password", () => {
    assert.equal(verifyRobokassaResult(callback(), { ...order, isTest: false }, config), false);
    assert.equal(verifyRobokassaResult(callback({}, config.password1), order, config), false);
    assert.equal(verifyRobokassaResult(callback(), order, { ...config, password2: "live-key" }), false);
  });
  it("requires RUB and the correct provider", () => {
    assert.equal(verifyRobokassaResult(callback(), { ...order, currency: "USD" }, config), false);
    assert.equal(verifyRobokassaResult(callback(), { ...order, provider: "yookassa" }, config), false);
  });
  it("rejects non-zero sub-kopeck precision, exponent, signs and garbage", () => {
    for (const amount of ["990.000001", "990.001", "9.90e2", "+990", "990,00", "990.0000000", "990foo"]) assert.equal(robokassaAmountKopecks(amount), null);
    assert.equal(robokassaAmountKopecks("990.010000"), BigInt(99001));
  });
});
