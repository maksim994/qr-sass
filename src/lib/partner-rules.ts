import { z } from "zod";
import { COOKIE_CONSENT_VERSION } from "@/lib/cookie-consent-version";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics-policy";

export const PARTNER_COOKIE = "qrs_partner_visit";
export const PARTNER_WINDOW_MS = 30 * 86400_000;
export const partnerCodeSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,39}$/);
export const partnerCreateSchema = z.object({ name: z.string().trim().min(2).max(100), code: partnerCodeSchema });
export function eligiblePartnerVisit(visit: { expiresAt: Date; partner: { enabled: boolean } } | null, now = new Date()) {
  return !!visit && visit.expiresAt > now && visit.partner.enabled;
}

export type PartnerPayment = { workspaceId: string; status: string; amount: number; currency: string; paidAt: Date | null };
export function summarizePartnerPayments(payments: PartnerPayment[]) {
  const customers = new Set<string>();
  let firstPayments = 0, renewals = 0, grossRub = 0, refundedRub = 0;
  const sorted = [...payments].filter(p => p.paidAt && ["SUCCEEDED", "REFUNDED"].includes(p.status)).sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime());
  for (const p of sorted) {
    if (customers.has(p.workspaceId)) renewals++;
    else { customers.add(p.workspaceId); firstPayments++; }
    if (p.currency === "RUB") {
      grossRub += p.amount;
      if (p.status === "REFUNDED") refundedRub += p.amount;
    }
  }
  return { firstPayments, renewals, grossRub, refundedRub, netRub: grossRub - refundedRub };
}

export const partnerVisitSchema = z.union([
  z.object({ code: partnerCodeSchema, analyticsEnabled: z.literal(true), policyVersion: z.literal(ANALYTICS_POLICY_VERSION) }),
  z.object({ code: partnerCodeSchema, consent: z.literal(true), consentVersion: z.literal(COOKIE_CONSENT_VERSION) }).transform(value => ({ code: value.code, analyticsEnabled: true as const, policyVersion: `opt-in:${value.consentVersion}` })),
]);
