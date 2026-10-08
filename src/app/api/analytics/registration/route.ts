import { getApiUser } from "@/lib/api-auth";
import { apiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/db";

/** One-use server receipt. Existing logins and account linking never set it. */
export async function POST() {
  const actor = await getApiUser();
  if (!actor || actor.kind !== "session") return apiSuccess({ registration: false });
  const claimed = await getDb().user.updateMany({
    where: { id: actor.id, metrikaRegistrationPending: true, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
    data: { metrikaRegistrationPending: false },
  });
  return apiSuccess({ registration: claimed.count === 1 });
}
