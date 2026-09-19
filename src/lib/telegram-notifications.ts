import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { decryptIntegrationSecret } from "@/lib/integration-secrets";
export type TelegramResult = {
  ok: boolean;
  messageId?: string;
  retryAfter?: number;
  permanent?: boolean;
  error?: string;
};
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
): Promise<TelegramResult> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const body = await response.json().catch(() => null);
    if (response.ok && body?.ok && body.result?.message_id)
      return { ok: true, messageId: String(body.result.message_id) };
    return {
      ok: false,
      retryAfter: Number(body?.parameters?.retry_after) || undefined,
      permanent: [400, 401, 403, 404].includes(response.status),
      error:
        response.status === 429
          ? "Лимит Telegram. Отправка отложена."
          : "Telegram отклонил сообщение. Проверьте токен и права бота в чате.",
    };
  } catch {
    return {
      ok: false,
      error:
        "Нет подтверждения от Telegram. Повтор может привести к дублирующему сообщению.",
    };
  }
}
export async function deliverNextNotification(transport = sendTelegram) {
  const db = getDb();
  const config = await db.telegramSettings.findUnique({
    where: { id: "default" },
  });
  if (!config?.tokenCipher || !config.chatId) return false;
  const now = new Date(),
    leaseToken = randomUUID();
  const job = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "NotificationOutbox" WHERE (status = 'PENDING' AND "nextAttemptAt" <= ${now}) OR (status = 'SENDING' AND "leaseUntil" < ${now}) ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!rows[0]) return null;
    return tx.notificationOutbox.update({
      where: { id: rows[0].id },
      data: {
        status: "SENDING",
        leaseUntil: new Date(now.getTime() + 60000),
        leaseToken,
        attempts: { increment: 1 },
      },
    });
  });
  if (!job) return false;
  const where = { id: job.id, leaseToken };
  if (
    job.revision !== config.revision ||
    job.chatId !== config.chatId ||
    (!config.enabled && job.eventName !== "test")
  ) {
    await db.notificationOutbox.updateMany({
      where,
      data: {
        status: "CANCELED",
        lastError: "Настройки получателя изменены или уведомления отключены.",
        leaseUntil: null,
      },
    });
    return true;
  }
  let result: TelegramResult;
  try {
    result = await transport(
      decryptIntegrationSecret(config.tokenCipher),
      job.chatId,
      job.text,
    );
  } catch {
    result = {
      ok: false,
      permanent: true,
      error:
        "Не удалось прочитать токен. Проверьте ключ шифрования интеграций.",
    };
  }
  await db.notificationOutbox.updateMany({
    where,
    data: result.ok
      ? {
          status: "SENT",
          sentAt: new Date(),
          messageId: result.messageId,
          lastError: null,
          leaseUntil: null,
        }
      : {
          status: result.permanent || job.attempts >= 8 ? "FAILED" : "PENDING",
          lastError: result.error ?? "Отправка не подтверждена.",
          leaseUntil: null,
          nextAttemptAt: new Date(
            Date.now() +
              Math.max(
                result.retryAfter ?? 0,
                Math.min(3600, 15 * 2 ** job.attempts),
              ) *
                1000,
          ),
        },
  });
  return true;
}
export async function scheduleDailyDigest(now = new Date()) {
  const db = getDb(),
    config = await db.telegramSettings.findUnique({ where: { id: "default" } });
  if (
    !config?.enabled ||
    !config.dailyDigest ||
    !config.tokenCipher ||
    !config.chatId
  )
    return;
  const msk = new Date(now.getTime() + 3 * 3600000);
  if (msk.getUTCHours() < config.digestHour) return;
  const today = msk.toISOString().slice(0, 10),
    end = new Date(`${today}T00:00:00+03:00`),
    start = new Date(end.getTime() - 86400000);
  if (
    await db.notificationOutbox.findUnique({
      where: { key: `digest:${today}` },
      select: { id: true },
    })
  )
    return;
  const groups = await db.businessEvent.groupBy({
    by: ["name"],
    where: { isTest: false, createdAt: { gte: start, lt: end } },
    _count: true,
  });
  const count = (name: string) =>
    groups.find((row) => row.name === name)?._count ?? 0;
  const money = await db.payment.aggregate({
    where: {
      isTest: false,
      paidAt: { gte: start, lt: end },
      status: "SUCCEEDED",
    },
    _sum: { amount: true },
  });
  const text = [
    `Сводка за ${new Date(start.getTime() + 3 * 3600000).toISOString().slice(0, 10)} · Москва`,
    `Регистрации: ${count("registration_completed")}`,
    `Начали триал: ${count("trial_started")}`,
    `Оплаты: ${count("payment_succeeded")}`,
    `Подтверждено оплат: ${money._sum.amount ?? 0} ₽`,
    "События учитываются с момента включения нового журнала.",
  ].join("\n");
  await db.notificationOutbox.createMany({
    data: {
      key: `digest:${today}`,
      eventName: "digest",
      text,
      chatId: config.chatId,
      revision: config.revision,
    },
    skipDuplicates: true,
  });
}
