import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { assertCanCreateQrCodes, type QrCreateQuotaCheck } from "@/lib/plans";

export class QrQuotaError extends Error {
  constructor(public quota: Extract<QrCreateQuotaCheck, { ok: false }>) { super(quota.message); }
}
/** Serialize all writers of the workspace QR quota (single, duplicate and bulk). */
export async function createQrWithinQuota<T>(
  options: Parameters<typeof assertCanCreateQrCodes>[0],
  create: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return getDb().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${options.workspaceId} FOR UPDATE`;
    const quota = await assertCanCreateQrCodes({ ...options, db: tx });
    if (!quota.ok) throw new QrQuotaError(quota);
    return create(tx);
  }, { timeout: 20000 });
}
