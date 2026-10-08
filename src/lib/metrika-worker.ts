import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { paymentConversionCsv } from "@/lib/metrika-attribution";
import { readMetrikaUpload, uploadMetrikaConversion } from "@/lib/metrika-upload";

/** Run periodically after deployment. Payment fulfilment never waits for Yandex. */
export async function deliverMetrikaPayments() {
  const token = env.METRIKA_OAUTH_TOKEN;
  if (!token || process.env.NODE_ENV !== "production") return { enabled: false };
  return processMetrikaPayments(getDb(), token);
}

export async function processMetrikaPayments(db: Prisma.TransactionClient, token: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 21 * 86400_000);
  await db.payment.updateMany({
    where: { metrikaState: "SENDING", metrikaAttemptAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
    data: { metrikaState: "REVIEW", metrikaLastError: "INTERRUPTED_UPLOAD" },
  });
  await db.payment.updateMany({
    where: { metrikaState: "PENDING", metrikaClientId: { not: null }, createdAt: { lt: cutoff } },
    data: { metrikaState: "EXPIRED", metrikaClientId: null },
  });
  const waiting = await db.payment.findMany({ where: { metrikaState: "UPLOADED", metrikaUploadId: { not: null } }, take: 50, orderBy: { metrikaAttemptAt: "asc" } });
  for (const p of waiting) {
    if (!p.metrikaCounterId || !p.metrikaUploadId) continue;
    try {
      const status = await readMetrikaUpload(p.metrikaCounterId, token, p.metrikaUploadId);
      if (status === "PROCESSED" || status === "LINKAGE_FAILURE") await db.payment.updateMany({ where: { id: p.id, metrikaState: "UPLOADED" }, data: {
        metrikaState: status === "PROCESSED" ? "PROCESSED" : "REVIEW", metrikaLastError: status === "LINKAGE_FAILURE" ? status : null, metrikaClientId: null,
      } });
    } catch { /* Read-only status polling can safely retry on the next run. */ }
  }
  const rows = await db.payment.findMany({ where: {
    status: "SUCCEEDED", isTest: false, paidAt: { not: null }, metrikaState: "PENDING", metrikaClientId: { not: null }, metrikaCounterId: { not: null }, metrikaConsentAt: { not: null },
    OR: [{ metrikaAttemptAt: null }, { metrikaAttemptAt: { lt: new Date(now.getTime() - 15 * 60_000) } }],
  }, orderBy: { paidAt: "asc" }, take: 25 });
  let uploaded = 0;
  for (const p of rows) {
    if (!p.metrikaClientId || !p.metrikaCounterId || !p.paidAt) continue;
    const claimed = await db.payment.updateMany({ where: { id: p.id, status: "SUCCEEDED", isTest: false, metrikaState: "PENDING", metrikaClientId: p.metrikaClientId }, data: { metrikaState: "SENDING", metrikaAttemptAt: now } });
    if (!claimed.count) continue;
    const csv = paymentConversionCsv({ clientId: p.metrikaClientId, paidAt: p.paidAt, amount: p.amount, currency: p.currency });
    const outcome = await uploadMetrikaConversion(p.metrikaCounterId, token, csv, p.id);
    await db.payment.updateMany({ where: { id: p.id, metrikaState: "SENDING" }, data: outcome.state === "UPLOADED"
      ? { metrikaState: "UPLOADED", metrikaUploadId: outcome.uploadId, metrikaLastError: null }
      : { metrikaState: outcome.state, metrikaLastError: outcome.error } });
    if (outcome.state === "UPLOADED") uploaded++;
  }
  return { enabled: true, considered: rows.length, uploaded, review: await db.payment.count({ where: { metrikaState: "REVIEW" } }) };
}
