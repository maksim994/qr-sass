import { WorkspacePlan } from "@prisma/client";
import { logger } from "@/lib/logger";

export const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
export const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

export type YookassaPayment = {
  id: string;
  status: string;
  paid?: boolean;
  test?: boolean;
  amount?: { value?: string; currency?: string };
  recipient?: { account_id?: string };
  metadata?: Record<string, string>;
};

function authHeader() {
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64")}`;
}

export function isYookassaTestMode() {
  return YOOKASSA_SECRET_KEY.startsWith("test_");
}

export function formatYookassaAmount(amountRub: number) {
  return amountRub.toFixed(2);
}

export async function createYookassaPayment(
  amount: number,
  description: string,
  metadata: Record<string, string>,
) {
  const idempotencyKey = crypto.randomUUID();
  const response = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: {
        value: formatYookassaAmount(amount),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "embedded",
      },
      description,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YooKassa error: ${error}`);
  }

  return response.json() as Promise<YookassaPayment & { confirmation?: { confirmation_token?: string } }>;
}

export async function getYookassaPayment(paymentId: string): Promise<YookassaPayment | null> {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    logger.error({
      area: "api",
      route: "/api/billing/webhook",
      message: "YooKassa credentials are not configured",
      code: "CONFIG_ERROR",
      status: 500,
    });
    return null;
  }

  const response = await fetch(`${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YooKassa get payment failed: ${error}`);
  }

  return response.json() as Promise<YookassaPayment>;
}

export function yookassaPaymentMatchesOrder(
  remote: YookassaPayment,
  order: { amount: number; currency: string; planId: WorkspacePlan | null },
): { ok: true } | { ok: false; reason: string } {
  if (remote.status !== "succeeded") {
    return { ok: false, reason: "status" };
  }
  if (remote.test && !isYookassaTestMode()) {
    return { ok: false, reason: "test_in_live" };
  }
  if (remote.recipient?.account_id && remote.recipient.account_id !== YOOKASSA_SHOP_ID) {
    return { ok: false, reason: "recipient" };
  }
  if ((remote.amount?.currency ?? "RUB") !== order.currency) {
    return { ok: false, reason: "currency" };
  }
  if ((remote.amount?.value ?? "") !== formatYookassaAmount(order.amount)) {
    return { ok: false, reason: "amount" };
  }
  if (!order.planId || order.planId === "FREE") {
    return { ok: false, reason: "plan" };
  }
  return { ok: true };
}
