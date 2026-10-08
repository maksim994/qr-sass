import { cookies } from "next/headers";
import { PARTNER_COOKIE } from "@/lib/partner-rules";
import { getApiUser } from "@/lib/api-auth";
import { apiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/db";

export async function POST() {
  (await cookies()).delete(PARTNER_COOKIE);
  const actor = await getApiUser();
  if (actor?.kind === "session") await getDb().payment.updateMany({
    where: { metrikaUserId: actor.id, metrikaState: { in: ["PENDING", "EXPIRED", "REVIEW"] } },
    data: { metrikaClientId: null, metrikaState: "REVOKED" },
  });
  return apiSuccess({ revoked: true });
}
