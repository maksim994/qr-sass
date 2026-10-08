import { activatedWorkspaces } from "@/lib/qr-activation";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { PARTNER_COOKIE, eligiblePartnerVisit } from "@/lib/partner-rules";

/** Called only when creating a new account, never during login or team acceptance. */
export async function readRegistrationPartner() {
  let id: string | undefined;
  try { id = (await cookies()).get(PARTNER_COOKIE)?.value; } catch { return null; }
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null;
  return id;
}

export async function registrationPartnerData(tx: Prisma.TransactionClient, visitId: string | null) {
  if (!visitId) return {};
  const visit = await tx.partnerVisit.findUnique({ where: { id: visitId }, include: { partner: { select: { enabled: true } } } });
  // The recorded consent version is historical evidence; a terms revision must
  // not erase an already captured first touch within its original 30-day window.
  return eligiblePartnerVisit(visit) && visit ? { partnerId: visit.partnerId, partnerIsTest: visit.isTest } : {};
}

export async function listPartnerReport(isTest = false) {
  const db = getDb();
  const partners = await db.partner.findMany({ orderBy: { createdAt: "desc" }, include: {
    visits: { where: { isTest }, select: { clicks: true } },
    workspaces: { where: { partnerIsTest: isTest }, select: {
      id: true, trialUsedAt: true,
      qrCodes: { select: { id: true, kind: true, shortCode: true } },
      funnelEvents: { where: { isTest, name: { in: ["qr_created", "qr_downloaded", "first_external_open"] } }, select: { name: true, workspaceId: true, qrCodeId: true } },
      payments: { where: { isTest, status: { in: ["SUCCEEDED", "REFUNDED"] } }, select: { workspaceId: true, status: true, amount: true, currency: true, paidAt: true } },
    } },
  } });
  return partners.map(p => ({ ...p, activated: activatedWorkspaces(p.workspaces.flatMap(w => w.funnelEvents), p.workspaces.flatMap(w => w.qrCodes)).active.size }));
}
