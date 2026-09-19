import { PaymentStatus } from "@prisma/client";
import { getDb } from "@/lib/db";
import { syncYookassaPayment } from "@/lib/billing-apply";

const DEFAULT_STALE_MS = 2 * 60 * 1000;
const DEFAULT_LIMIT = 50;

export async function reconcilePendingPayments(input?: {
  providerPaymentId?: string;
  olderThanMs?: number;
  limit?: number;
}) {
  if (input?.providerPaymentId) {
    const result = await syncYookassaPayment(input.providerPaymentId);
    return { checked: 1, applied: result.applied ? 1 : 0, results: [result] };
  }

  const db = getDb();
  const olderThanMs = input?.olderThanMs ?? DEFAULT_STALE_MS;
  const limit = Math.min(Math.max(input?.limit ?? DEFAULT_LIMIT, 1), 100);
  const staleBefore = new Date(Date.now() - olderThanMs);
  const pending = await db.payment.findMany({
    where: { status: PaymentStatus.PENDING, createdAt: { lte: staleBefore } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { providerPaymentId: true },
  });
  const remaining = limit - pending.length;
  const canceled =
    remaining > 0
      ? await db.payment.findMany({
          where: { status: PaymentStatus.CANCELED, createdAt: { lte: staleBefore } },
          orderBy: { createdAt: "asc" },
          take: remaining,
          select: { providerPaymentId: true },
        })
      : [];
  const rows = [...pending, ...canceled];

  const results = [];
  let applied = 0;
  for (const row of rows) {
    const result = await syncYookassaPayment(row.providerPaymentId);
    if (result.applied) applied += 1;
    results.push(result);
  }
  return { checked: rows.length, applied, results };
}
