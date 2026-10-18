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
  const event = claimed.count ? await getDb().funnelEvent.findFirst({where:{userId:actor.id,name:"registration_completed"},select:{source:true}}) : null;
  return apiSuccess({ registration: claimed.count === 1, method: event?.source === "email" ? "email" : event?.source === "telegram" ? "telegram" : "yandex" });
}
