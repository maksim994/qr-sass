import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminOrNull } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import {
  encryptIntegrationSecret,
  integrationKeyReady,
} from "@/lib/integration-secrets";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    enabled: z.boolean(),
    token: z.string().trim().max(200).optional(),
    chatId: z
      .string()
      .trim()
      .regex(/^-?\d+$/),
    events: z
      .array(
        z.enum([
          "registration_completed",
          "trial_started",
          "payment_succeeded",
          "admin_role",
        ]),
      )
      .max(4),
    dailyDigest: z.boolean(),
    digestHour: z.number().int().min(0).max(23),
  }),
  z.object({ action: z.literal("test") }),
  z.object({ action: z.literal("retry"), id: z.string().min(1) }),
]);
export async function POST(req: Request) {
  const actor = await getAdminOrNull();
  if (!actor) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  const parsed = schema.safeParse(await readJsonBody(req));
  if (!parsed.success)
    return apiError(MSG.NOTIFICATIONS_INVALID, "VALIDATION_ERROR", 400);
  const input = parsed.data,
    db = getDb();
  try {
    if (input.action === "save") {
      if (input.token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(input.token))
        return apiError(MSG.NOTIFICATIONS_INVALID, "VALIDATION_ERROR", 400);
      if ((input.token || input.enabled) && !integrationKeyReady())
        return apiError(MSG.NOTIFICATIONS_KEY_REQUIRED, "CONFIG_ERROR", 400);
      const old = await db.telegramSettings.findUnique({
        where: { id: "default" },
      });
      const tokenCipher = input.token
        ? encryptIntegrationSecret(input.token)
        : old?.tokenCipher;
      if (input.enabled && !tokenCipher)
        return apiError(MSG.NOTIFICATIONS_NOT_READY, "VALIDATION_ERROR", 400);
      await db.telegramSettings.upsert({
        where: { id: "default" },
        create: {
          enabled: input.enabled,
          chatId: input.chatId,
          tokenCipher,
          events: input.events,
          dailyDigest: input.dailyDigest,
          digestHour: input.digestHour,
        },
        update: {
          enabled: input.enabled,
          chatId: input.chatId,
          ...(input.token ? { tokenCipher } : {}),
          events: input.events,
          dailyDigest: input.dailyDigest,
          digestHour: input.digestHour,
          revision: { increment: 1 },
        },
      });
      return apiSuccess({ saved: true });
    }
    const settings = await db.telegramSettings.findUnique({
      where: { id: "default" },
    });
    if (!settings?.tokenCipher || !settings.chatId || !integrationKeyReady())
      return apiError(MSG.NOTIFICATIONS_NOT_READY, "BAD_REQUEST", 400);
    if (input.action === "test") {
      await db.notificationOutbox.create({
        data: {
          key: `test:${randomUUID()}`,
          eventName: "test",
          text: "Тест QR-S.ru: Telegram-уведомления администратора подключены.",
          chatId: settings.chatId,
          revision: settings.revision,
        },
      });
    } else {
      const result = await db.notificationOutbox.updateMany({
        where: {
          id: input.id,
          status: "FAILED",
          revision: settings.revision,
          chatId: settings.chatId,
        },
        data: {
          status: "PENDING",
          attempts: 0,
          lastError: null,
          nextAttemptAt: new Date(),
        },
      });
      if (!result.count)
        return apiError(MSG.NOTIFICATIONS_RETRY_UNAVAILABLE, "CONFLICT", 409);
    }
    return apiSuccess({ queued: true });
  } catch {
    return apiError(MSG.ADMIN_CHANGE_FAILED, "INTERNAL_ERROR", 500);
  }
}
