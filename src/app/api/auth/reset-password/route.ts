import { createSessionToken, hashPassword, setAuthCookie } from "@/lib/auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashResetToken } from "@/lib/password-reset";
import { consumeRateLimit, getClientIp, resetPasswordRateLimiter } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/reset-password";

  try {
    const ip = getClientIp(request);
    const limit = await consumeRateLimit(resetPasswordRateLimiter, ip);
    if (!limit.success) {
      return apiError(MSG.TOO_MANY_REQUESTS, "VALIDATION_ERROR", 429, undefined, requestId);
    }

    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
    }
    const parsed = resetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(MSG.PASSWORD_RESET_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const db = getDb();
    const tokenHash = hashResetToken(parsed.data.token);
    const passwordHash = await hashPassword(parsed.data.password);

    const user = await db.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) return null;

      const row = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!row) return null;

      await tx.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: row.userId },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
          emailVerifiedAt: new Date(),
        },
      });
    });

    if (!user) {
      return apiError(MSG.PASSWORD_RESET_INVALID, "UNAUTHORIZED", 401, undefined, requestId);
    }

    const session = await createSessionToken({ sub: user.id, email: user.email, sv: user.sessionVersion });
    await setAuthCookie(session);

    logger.info({ area: "api", route, requestId, message: "Password reset completed", status: 200 });
    return apiSuccess({ message: MSG.PASSWORD_UPDATED, userId: user.id }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Reset password error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
