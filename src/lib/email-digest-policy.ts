import { DAY_MS } from "@/lib/email-notification-policy";

/** A complete calendar day in Moscow, independent of the host timezone. */
export function digestDateWindow(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid digest date");
  const start = new Date(`${day}T00:00:00+03:00`);
  if (!Number.isFinite(start.getTime()) || new Date(start.getTime() + 3 * 3600000).toISOString().slice(0, 10) !== day)
    throw new Error("Invalid digest date");
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function digestTitle(day: string, test = false) {
  return `${test ? "[ТЕСТ] " : ""}Сводка QR-S за ${day.split("-").reverse().join(".")}`;
}

export function digestTotalsText(registrations: number, trials: number, payments: number, revenue: number) {
  return `Регистрации: ${registrations}.\nЗапуски пробного периода: ${trials}.\nОплаты: ${payments}.\nВыручка: ${revenue} ₽.${registrations === 0 && payments === 0 ? "\nЗа сутки регистраций и оплат не было." : ""}`;
}
