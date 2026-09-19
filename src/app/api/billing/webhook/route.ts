import { NextRequest, NextResponse } from "next/server";
import { MSG } from "@/lib/user-messages";
import { logger } from "@/lib/logger";
import { getYookassaPayment } from "@/lib/yookassa";
import { billingActionFromRemoteStatus } from "@/lib/billing-provider";
import { cancelPendingPayment, fulfillYookassaPayment } from "@/lib/billing-apply";

function jsonOk() {
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { event?: string; object?: { id?: string } }
      | null;
    const event = typeof body?.event === "string" ? body.event : "";
    const providerPaymentId = typeof body?.object?.id === "string" ? body.object.id.trim() : "";

    if (!providerPaymentId) {
      logger.warn({
        area: "api",
        route: "/api/billing/webhook",
        message: "Webhook without payment id",
        code: "BAD_REQUEST",
        status: 200,
      });
      return jsonOk();
    }

    const remote = await getYookassaPayment(providerPaymentId);
    if (!remote) {
      logger.warn({
        area: "api",
        route: "/api/billing/webhook",
        message: "Unknown YooKassa payment",
        code: "NOT_FOUND",
        status: 200,
        details: { providerPaymentId, event },
      });
      return jsonOk();
    }

    const action = billingActionFromRemoteStatus(remote.status);

    if (action === "cancel") {
      await cancelPendingPayment(providerPaymentId);
      return jsonOk();
    }

    if (action !== "succeed") {
      return jsonOk();
    }

    const result = await fulfillYookassaPayment(remote);
    if (result.reason === "unmatched") {
      logger.warn({
        area: "api",
        route: "/api/billing/webhook",
        message: "Webhook payment could not be matched to a local order",
        code: "NOT_FOUND",
        status: 200,
        details: { providerPaymentId, reason: result.reason, event },
      });
    }
    return jsonOk();
  } catch (error) {
    logger.error({
      area: "api",
      route: "/api/billing/webhook",
      message: "Webhook error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return NextResponse.json({ error: MSG.INTERNAL_ERROR }, { status: 500 });
  }
}
