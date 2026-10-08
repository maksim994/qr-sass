import type { EntitlementStatus } from "@/lib/entitlements";
/** A server-rendered reminder; never changes access or sends messages. */
export function accessReminder(status: EntitlementStatus, periodEnd: Date | null, now = new Date()) {
  if (!periodEnd || status === "free") return null;
  const remaining = periodEnd.getTime() - now.getTime();
  if (!Number.isFinite(remaining) || remaining > 3 * 86400_000 || remaining < -7 * 86400_000) return null;
  const date = periodEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" });
  return remaining > 0
    ? { title: status === "trial" ? "Пробный период скоро закончится" : "Платный доступ скоро закончится", text: `Доступ действует до ${date}. Продление вручную, автоматических списаний нет.` }
    : { title: "Период доступа завершён", text: `Период завершился ${date}. Сейчас доступны возможности бесплатного тарифа.` };
}
