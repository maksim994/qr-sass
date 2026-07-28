import { getSession, verifyPassword } from "@/lib/auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { z } from "zod";

const unlinkSchema = z.object({
  currentPassword: z.string().optional(),
});

export async function DELETE(req: Request) {
  const requestId = getRequestId(req);
  const session = await getSession();
  if (!session?.sub) {
    return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  }

  const raw = await readJsonBody(req);
  const parsed = unlinkSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, yandexId: true, passwordHash: true },
  });

  if (!user) {
    return apiError(MSG.USER_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  }

  if (!user.yandexId) {
    return apiError(MSG.YANDEX_NOT_LINKED, "BAD_REQUEST", 400, undefined, requestId);
  }

  if (user.passwordHash === "telegram-auth") {
    return apiError(
      "Отвязка Яндекса недоступна для аккаунтов Telegram.",
      "FORBIDDEN",
      403,
      undefined,
      requestId
    );
  }

  const password = parsed.data.currentPassword;
  if (!password) {
    return apiError(MSG.YANDEX_UNLINK_PASSWORD_REQUIRED, "VALIDATION_ERROR", 400, undefined, requestId);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return apiError("Неверный пароль.", "VALIDATION_ERROR", 400, undefined, requestId);
  }

  await db.user.update({
    where: { id: user.id },
    data: { yandexId: null },
  });

  return apiSuccess({ yandexLinked: false }, 200, requestId);
}
