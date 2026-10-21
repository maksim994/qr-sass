export const DAY_MS = 86_400_000;
export const OWNER_EMAIL = "maksim994@yandex.ru";
export const EMAIL_MAX_ATTEMPTS = 5;
export const EMAIL_KIND_LABELS: Record<string, string> = {
  verify_email: "Подтверждение email",
  password_reset: "Сброс пароля",
  password_changed: "Пароль изменён",
  email_changed: "Email изменён",
  payment_received: "Оплата получена",
  period_ending: "Окончание периода",
  period_ended: "Период закончился",
  team_invite: "Приглашение в команду",
  owner_alert: "Сигнал владельцу",
  owner_digest: "Ежедневная сводка",
  test: "Тест доставки",
};
export function canEmail(address: string) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) &&
    !address.toLowerCase().endsWith("@telegram.local")
  );
}
export function reminderStages(trial: boolean) {
  return trial ? [1, 0] : [3, 1, 0];
}
/** Exclusive windows avoid sending both reminders after a worker outage. */
export function periodNoticeStage(
  end: Date,
  now: Date,
  trial: boolean,
): number | null {
  const remaining = end.getTime() - now.getTime();
  if (remaining <= 0) return remaining > -DAY_MS ? 0 : null;
  if (remaining <= DAY_MS) return 1;
  return !trial && remaining <= 3 * DAY_MS ? 3 : null;
}
export function moscowDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function digestWindow(now: Date) {
  const day = moscowDay(now);
  const end = new Date(`${day}T00:00:00+03:00`);
  return {
    day,
    start: new Date(end.getTime() - DAY_MS),
    end,
    ready:
      Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Moscow",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(now),
      ) >= 9,
  };
}
export function retryDelay(attempt: number) {
  return Math.min(6 * 60 * 60_000, 60_000 * 5 ** Math.max(0, attempt - 1));
}
export function smtpErrorCode(error: unknown): string {
  const e = error as { code?: string; responseCode?: number };
  if (e?.responseCode) return `SMTP_${Number(e.responseCode)}`;
  return [
    "EAUTH",
    "ECONNECTION",
    "ETIMEDOUT",
    "ESOCKET",
    "EDNS",
    "EENVELOPE",
  ].includes(e?.code ?? "")
    ? e.code!
    : "DELIVERY_ERROR";
}
export function permanentSmtpError(error: unknown) {
  const e = error as { responseCode?: number; code?: string };
  return (
    e?.code === "EENVELOPE" ||
    (Number(e?.responseCode) >= 550 && Number(e?.responseCode) <= 554)
  );
}
