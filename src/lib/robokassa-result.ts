import { getDb } from "@/lib/db";
import { applySucceededPayment } from "@/lib/billing-apply";
import { getRobokassaConfig, robokassaPaymentId, verifyRobokassaResult } from "@/lib/robokassa";

export async function processRobokassaResult(params: URLSearchParams) {
  const invoiceId = params.get("InvId") ?? "";
  if (!/^[1-9]\d{0,18}$/.test(invoiceId)) return { ok: false, status: 400 } as const;
  const local = await getDb().payment.findUnique({ where: { providerPaymentId: robokassaPaymentId(invoiceId) } });
  if (!local) return { ok: false, status: 404 } as const;
  // Select the password from the persisted order, never from an incoming IsTest flag.
  if (!verifyRobokassaResult(params, local, getRobokassaConfig(local.isTest))) {
    return { ok: false, status: 403 } as const;
  }
  const result = await applySucceededPayment(local.id);
  const accepted = ["applied", "already_applied", "lost_claim", "test_confirmed", "access_preserved", "not_pending"].includes(result.reason);
  return accepted ? { ok: true, invoiceId } as const : { ok: false, status: 500 } as const;
}
