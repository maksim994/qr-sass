import { getDb } from "@/lib/db";
import { getEntitlements, type Entitlements } from "@/lib/entitlements";

/** Same managed-code scope as the creation quota, including legacy hosted codes. */
export async function editableManagedQrIds(workspaceId: string, rights?: Entitlements): Promise<string[] | null> {
  const entitlements = rights ?? await getEntitlements(workspaceId);
  if (!entitlements.allowsDynamic) return [];
  const limit = entitlements.plan.limits.maxDynamicQr;
  if (limit == null) return null;
  if (limit <= 0) return [];
  const rows = await getDb().qrCode.findMany({
    where: { workspaceId, isArchived: false, OR: [{ kind: "DYNAMIC" }, { shortCode: { not: null } }] },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit, select: { id: true },
  });
  return rows.map(row => row.id);
}
export async function canEditManagedQr(qr: { id: string; workspaceId: string; isArchived: boolean }) {
  if (qr.isArchived) return false;
  const ids = await editableManagedQrIds(qr.workspaceId);
  return ids === null || ids.includes(qr.id);
}
