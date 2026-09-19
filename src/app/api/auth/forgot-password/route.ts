import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { appUrl, sendMail } from "@/lib/mail";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS, canIssuePasswordReset } from "@/lib/password-reset";
import { consumeRateLimit, forgotPasswordRateLimiter, getClientIp } from "@/lib/rate-limit";
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
        requestId
      );
    }

    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
    }
    const parsed = forgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    const email = normalizeEmail(parsed.data.email);
    const emailLimit = await consumeRateLimit(forgotPasswordRateLimiter, `email:${email}`);
    if (!emailLimit.success) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    const db = getDb();
    const user = await db.user.findUnique({ where: { email } });
    if (!canIssuePasswordReset(user)) {
      return apiSuccess({ message: generic }, 200, requestId);
    }

    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendMail({
      to: user.email,
      subject: "Сброс пароля QR-S.ru",
      text: `Чтобы задать новый пароль, откройте ссылку в течение часа:\n${resetUrl}\n\nЕсли вы не запрашивали сброс, проигнорируйте письмо.`,
      html: `<p>Чтобы задать новый пароль, откройте ссылку в течение часа:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Если вы не запрашивали сброс, проигнорируйте письмо.</p>`,
    });

    if (!sent.sent && process.env.NODE_ENV !== "production") {
      logger.info({
        area: "api",
        route,
        requestId,
        message: "Password reset token issued without SMTP",
        details: { userId: user.id, resetUrl },
      });
    }

    return apiSuccess({ message: generic }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
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
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
