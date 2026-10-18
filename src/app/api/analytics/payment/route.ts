import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiSuccess, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
/** Claim a verified payment once. The offline worker uses the same atomic state gate. */
export async function POST(request: Request) {
  const actor = await getApiUser();
  if (!actor || actor.kind !== "session") return unauthorized();
  const body = await readJsonBody<{paymentId?:unknown}>(request);
  const id = typeof body?.paymentId === "string" ? body.paymentId : "";
  if (!id || id.length > 64) return apiSuccess({payment:null});
  const db = getDb();
  const payment = await db.payment.findFirst({where:{id,workspaceId:{in:actor.memberships.map(m=>m.workspaceId)},status:"SUCCEEDED",isTest:false,subscriptionId:{not:null},paidAt:{gte:new Date(Date.now()-24*60*60_000)}},select:{id:true,planId:true,amount:true,currency:true}});
  if (!payment) return apiSuccess({payment:null});
  const claimed = await db.payment.updateMany({where:{id:payment.id,status:"SUCCEEDED",isTest:false,metrikaState:"PENDING"},data:{metrikaState:"BROWSER_SENT",metrikaClientId:null}});
  return apiSuccess({payment:claimed.count ? {plan:payment.planId?.toLowerCase(),revenue:payment.amount,currency:payment.currency} : null});
}
