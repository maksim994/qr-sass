import { NextRequest } from "next/server";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { reconcilePendingPayments } from "@/lib/billing-reconcile";

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const body = await readJsonBody<{ providerPaymentId?: string }>(req);
  const providerPaymentId =
    typeof body?.providerPaymentId === "string" ? body.providerPaymentId.trim() : "";

  try {
    const result = await reconcilePendingPayments({
      providerPaymentId: providerPaymentId || undefined,
    });
    return apiSuccess(result, 200, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : MSG.INTERNAL_ERROR;
    return apiError(message, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
