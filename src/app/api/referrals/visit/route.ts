import { cookies } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { PARTNER_COOKIE, PARTNER_WINDOW_MS, partnerCodeSchema, eligiblePartnerVisit } from "@/lib/partner-rules";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { consumeRateLimit, getClientIp, redirectRateLimiter } from "@/lib/rate-limit";
import { MSG } from "@/lib/user-messages";
const schema = z.object({ code: partnerCodeSchema, consent: z.literal(true), consentVersion: z.literal(LEGAL_VERSION) });

export async function POST(request: Request) {
  const data = schema.safeParse(await readJsonBody(request));
  if (!data.success) return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400);
  if (/bot|crawler|spider|preview|telegram|facebookexternalhit|vkshare/i.test(request.headers.get("user-agent") ?? "")) return apiSuccess({ tracked: false });
  if (await getSession()) return apiSuccess({ tracked: false });
  if (!(await consumeRateLimit(redirectRateLimiter, `partner:${getClientIp(request)}`)).success) return apiSuccess({ tracked: false });
  const db = getDb();
  const jar = await cookies();
  const previousId = jar.get(PARTNER_COOKIE)?.value;
  const previous = previousId && /^[a-f0-9-]{36}$/.test(previousId) ? await db.partnerVisit.findUnique({ where: { id: previousId }, include: { partner: true } }) : null;
  // First touch wins even when another valid partner link is opened later.
  if (previous && previous.expiresAt > new Date()) {
    if (eligiblePartnerVisit(previous) && previous.partner.code === data.data.code) await db.partnerVisit.update({ where: { id: previous.id }, data: { clicks: { increment: 1 } } });
    return apiSuccess({ tracked: true });
  }
  const partner = await db.partner.findUnique({ where: { code: data.data.code } });
  if (!partner?.enabled) return apiSuccess({ tracked: false });
  const expiresAt = new Date(Date.now() + PARTNER_WINDOW_MS);
  const visit = await db.partnerVisit.create({ data: { partnerId: partner.id, expiresAt, consentVersion: data.data.consentVersion, isTest: process.env.NODE_ENV !== "production" } });
  jar.set(PARTNER_COOKIE, visit.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return apiSuccess({ tracked: true });
}
