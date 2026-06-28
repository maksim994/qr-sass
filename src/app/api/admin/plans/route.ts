import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const db = getDb();
  const overrides = await db.planOverride.findMany();
  const byPlan = Object.fromEntries(overrides.map((o) => [o.planId, o]));
  return apiSuccess(byPlan);
}
