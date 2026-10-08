import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export const ROBOKASSA_PAYMENT_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";
const MAX_INVOICE_ID = BigInt("9223372036854775807");
export type RobokassaConfig = {
  merchantLogin: string;
  password1: string;
  password2: string;
  isTest: boolean;
  algorithm: "MD5" | "SHA256" | "SHA512";
};

export function getRobokassaConfig(isTest = env.ROBOKASSA_TEST_MODE): RobokassaConfig {
  const merchantLogin = env.ROBOKASSA_MERCHANT_LOGIN ?? "";
  const password1 = (isTest ? env.ROBOKASSA_TEST_PASSWORD1 : env.ROBOKASSA_PASSWORD1) ?? "";
  const password2 = (isTest ? env.ROBOKASSA_TEST_PASSWORD2 : env.ROBOKASSA_PASSWORD2) ?? "";
  if (!merchantLogin || !password1 || !password2) throw new Error("Robokassa credentials are not configured");
  // A test key must never be capable of authorizing a live payment.
  if (!isTest && (password1 === env.ROBOKASSA_TEST_PASSWORD1 || password2 === env.ROBOKASSA_TEST_PASSWORD2)) {
    throw new Error("Robokassa live and test passwords must differ");
  }
  return { merchantLogin, password1, password2, isTest, algorithm: env.ROBOKASSA_HASH_ALGORITHM };
}

export function newRobokassaInvoiceId() {
  // Signed 63-bit integer as a string: never round through a JS number.
  return ((BigInt(`0x${randomBytes(8).toString("hex")}`) & MAX_INVOICE_ID) || BigInt(1)).toString();
}

export function robokassaPaymentId(invoiceId: string) {
  return `robokassa:${invoiceId}`;
}

function hash(value: string, algorithm: RobokassaConfig["algorithm"]) {
  return createHash(algorithm.toLowerCase()).update(value, "utf8").digest("hex");
}

export function buildRobokassaPayment(input: {
  invoiceId: string; orderId: string; amount: number; name: string; email: string;
}, config = getRobokassaConfig()) {
  if (!/^[1-9]\d{0,18}$/.test(input.invoiceId) || BigInt(input.invoiceId) > MAX_INVOICE_ID) {
    throw new Error("Invalid Robokassa invoice");
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || !input.orderId || !input.email) {
    throw new Error("Invalid Robokassa order");
  }
  const name = input.name.trim();
  if (!name || name.length > 128) throw new Error("Invalid Robokassa receipt name");
  const outSum = input.amount.toFixed(2);
  // NPD is selected in the merchant account; do not invent a `sno=npd` value.
  const receipt = encodeURIComponent(JSON.stringify({ items: [{
    name, quantity: 1, sum: input.amount, tax: "none", payment_object: "service",
  }] }));
  const custom = { Shp_order: input.orderId, Shp_test: config.isTest ? "1" : "0" };
  const signature = hash([
    config.merchantLogin, outSum, input.invoiceId, receipt, config.password1,
    ...Object.entries(custom).map(([key, value]) => `${key}=${value}`),
  ].join(":"), config.algorithm);
  return { action: ROBOKASSA_PAYMENT_URL, fields: {
    MerchantLogin: config.merchantLogin, OutSum: outSum, InvId: input.invoiceId,
    Description: name.slice(0, 100), Email: input.email, Culture: "ru", Encoding: "utf-8",
    Receipt: receipt, SignatureValue: signature, IsTest: config.isTest ? "1" : "0", ...custom,
  } };
}

// Robokassa uses six decimal places in live callbacks. Reject sub-kopeck values.
export function robokassaAmountKopecks(value: string): bigint | null {
  const match = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(value);
  if (!match || /[1-9]/.test((match[2] ?? "").slice(2))) return null;
  return BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0").slice(0, 2));
}

export function verifyRobokassaResult(params: URLSearchParams, order: {
  id: string; provider: string; providerPaymentId: string; amount: number; currency: string; isTest: boolean;
}, config: RobokassaConfig): boolean {
  const entries = [...params.entries()];
  if (entries.length > 32 || entries.some(([key]) => params.getAll(key).length !== 1)) return false;
  const invId = params.get("InvId") ?? "";
  const outSum = params.get("OutSum") ?? "";
  const signature = params.get("SignatureValue") ?? "";
  if (order.provider !== "robokassa" || order.currency !== "RUB" || order.isTest !== config.isTest ||
    !/^[1-9]\d{0,18}$/.test(invId) || robokassaPaymentId(invId) !== order.providerPaymentId ||
    params.get("Shp_order") !== order.id || params.get("Shp_test") !== (order.isTest ? "1" : "0") ||
    robokassaAmountKopecks(outSum) !== BigInt(order.amount) * BigInt(100)) return false;
  const custom = entries.filter(([key]) => key.startsWith("Shp_")).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (custom.some(([key, value]) => !/^Shp_[A-Za-z0-9_]+$/.test(key) || value.includes(":"))) return false;
  const expected = hash([outSum, invId, config.password2, ...custom.map(([key, value]) => `${key}=${value}`)].join(":"), config.algorithm);
  if (signature.length !== expected.length || !/^[a-f\d]+$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature.toLowerCase(), "hex"), Buffer.from(expected, "hex"));
}
