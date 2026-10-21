import { MSG } from "@/lib/user-messages";
import {
  apiError,
  apiSuccess,
  getRequestId,
  readJsonBody,
} from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { queueEmail, serviceMessage } from "@/lib/email-notifications";
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
  canIssuePasswordReset,
} from "@/lib/password-reset";
import {
  consumeRateLimit,
  forgotPasswordRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email-normalize";
import { forgotPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/forgot-password";
  const generic = MSG.PASSWORD_RESET_SENT;

  try {
    const ip = getClientIp(request);
    const limit = await consumeRateLimit(forgotPasswordRateLimiter, ip);
    if (!limit.success) {
      return apiError(
        MSG.TOO_MANY_PASSWORD_RESETS,
        "VALIDATION_ERROR",
        429,
        limit.retryAfterMs ? { retryAfterMs: limit.retryAfterMs } : undefined,
        requestId,
      );
    }

    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError(
        MSG.INVALID_JSON,
        "BAD_REQUEST",
        400,
        undefined,
        requestId,
      );
    }
    const parsed = forgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    const email = normalizeEmail(parsed.data.email);
    const emailLimit = await consumeRateLimit(
      forgotPasswordRateLimiter,
      `email:${email}`,
    );
    if (!emailLimit.success) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    const db = getDb();
    const user = await db.user.findUnique({ where: { email } });
    if (!canIssuePasswordReset(user)) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
      const fresh = await tx.user.findUnique({ where: { id: user.id } });
      if (!fresh || fresh.email !== email || !canIssuePasswordReset(fresh))
        return;
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = generateResetToken(),
        expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      const row = await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt },
      });
      const path = `/reset-password?token=${encodeURIComponent(token)}`;
      await queueEmail(tx, {
        key: `reset:${row.id}`,
        kind: "password_reset",
        to: user.email,
        userId: user.id,
        expiresAt,
        context: { resetId: row.id, sessionVersion: fresh.sessionVersion },
        message: serviceMessage(
          "Сброс пароля",
          "Вы запросили сброс пароля QR-S.ru. Ссылка одноразовая и действует один час. Если это были не вы, проигнорируйте письмо.",
          path,
          "Задать новый пароль",
        ),
      });
    });

    return apiSuccess({ message: generic }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({
        area: "api",
        route,
        requestId,
        message: error.message,
        code: error.code,
        status: 500,
      });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Forgot password error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return apiError(
      MSG.INTERNAL_ERROR,
      "INTERNAL_ERROR",
      500,
      undefined,
      requestId,
    );
  }
}
