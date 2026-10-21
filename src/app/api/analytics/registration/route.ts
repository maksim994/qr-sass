import { getApiUser } from "@/lib/api-auth";
import { apiSuccess, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { conversionCategories } from "@/lib/conversion-categories";
/** Each destination has its own one-use server receipt. */
export async function POST(request: Request) {
  const actor = await getApiUser();
  if (!actor || actor.kind !== "session") return apiSuccess({ registration: false, vkRegistration: false });
  const categories = await conversionCategories(await readJsonBody(request));
  const db = getDb();
  const result = await db.$transaction(async tx => {
    const where = { id: actor.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } };
    const user = await tx.user.findFirst({ where, select: { id: true } });
    if (!user) return { registration: false, vkRegistration: false };
    const event = await tx.funnelEvent.findFirst({ where: { userId: actor.id, name: "registration_completed" }, select: { source: true } });
    if (!event) return { registration: false, vkRegistration: false };
    const claimed = categories.analytics ? await tx.user.updateMany({ where: { ...where, metrikaRegistrationPending: true }, data: { metrikaRegistrationPending: false } }) : { count: 0 };
    const vk = categories.advertising ? await tx.advertisingConversionReceipt.createMany({ data: { key: `registration:${actor.id}` }, skipDuplicates: true }) : { count: 0 };
    return { registration: claimed.count === 1, vkRegistration: vk.count === 1, method: ["email", "telegram"].includes(event.source ?? "") ? event.source : "yandex" };
  });
  return apiSuccess(result);
}
