import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiSuccess, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { conversionCategories } from "@/lib/conversion-categories";
/** VK can claim a payment even when Metrika is off or its offline worker sent it. */
export async function POST(request: Request) {
  const actor = await getApiUser();
  if (!actor || actor.kind !== "session") return unauthorized();
  const body = await readJsonBody<{ paymentId?: unknown; analytics?: unknown; advertising?: unknown }>(request);
  const id = typeof body?.paymentId === "string" ? body.paymentId : "";
  if (!id || id.length > 64) return apiSuccess({ payment: null, analytics: false, advertising: false });
  const categories = await conversionCategories(body);
  const result = await getDb().$transaction(async tx => {
    const payment = await tx.payment.findFirst({ where: { id, workspaceId: { in: actor.memberships.map(m => m.workspaceId) }, status: "SUCCEEDED", isTest: false, subscriptionId: { not: null }, paidAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } }, select: { id: true, planId: true, amount: true, currency: true } });
    if (!payment) return { payment: null, analytics: false, advertising: false };
    const claimed = categories.analytics ? await tx.payment.updateMany({ where: { id: payment.id, status: "SUCCEEDED", isTest: false, metrikaState: "PENDING" }, data: { metrikaState: "BROWSER_SENT", metrikaClientId: null } }) : { count: 0 };
    const vk = categories.advertising ? await tx.advertisingConversionReceipt.createMany({ data: { key: `payment:${payment.id}` }, skipDuplicates: true }) : { count: 0 };
    return { payment: claimed.count || vk.count ? { plan: payment.planId?.toLowerCase(), revenue: payment.amount, currency: payment.currency } : null, analytics: claimed.count === 1, advertising: vk.count === 1 };
  });
  return apiSuccess(result);
}
