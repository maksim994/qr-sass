import type { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
export const BUSINESS_EVENT_LABELS: Record<string, string> = {
  registration_completed: "Новый пользователь",
  trial_started: "Начало триала",
  payment_succeeded: "Оплата подписки",
  admin_role: "Изменение прав администратора",
};
type EventInput = {
  key: string;
  name: string;
  workspaceId?: string;
  userId?: string;
  paymentId?: string;
  isTest?: boolean;
  payload?: Prisma.InputJsonObject;
};
export async function recordBusinessEvent(
  tx: Prisma.TransactionClient,
  event: EventInput,
) {
  const payload = event.payload ?? {};
  const created = await tx.businessEvent.createMany({
    data: { ...event, payload },
    skipDuplicates: true,
  });
  if (!created.count || event.isTest) return;
  const config = await tx.telegramSettings.findUnique({
    where: { id: "default" },
  });
  if (
    !config?.enabled ||
    !config.tokenCipher ||
    !config.chatId ||
    !config.events.includes(event.name)
  )
    return;
  const link = event.paymentId
    ? `/admin/payments/${event.paymentId}`
    : event.workspaceId
      ? `/admin/workspaces/${event.workspaceId}`
      : event.userId
        ? `/admin/users/${event.userId}`
        : "/admin";
  const lines = [BUSINESS_EVENT_LABELS[event.name] ?? event.name];
  if (event.name === "payment_succeeded")
    lines[0] = payload.firstPayment
      ? "Первая оплата подписки"
      : "Повторная оплата подписки";
  if (payload.amount != null) lines.push(`Сумма: ${payload.amount} ₽`);
  if (payload.plan) lines.push(`Тариф: ${payload.plan}`);
  if (payload.source) lines.push(`Способ регистрации: ${payload.source}`);
  if (typeof payload.periodEnd === "string")
    lines.push(
      `Доступ до: ${new Date(payload.periodEnd).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`,
    );
  lines.push(new URL(link, env.APP_URL).toString());
  await tx.notificationOutbox.createMany({
    data: {
      key: `event:${event.key}`,
      eventName: event.name,
      text: lines.join("\n"),
      chatId: config.chatId,
      revision: config.revision,
    },
    skipDuplicates: true,
  });
}
