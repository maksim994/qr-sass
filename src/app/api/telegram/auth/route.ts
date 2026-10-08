import { createSessionToken, setAuthCookie } from "@/lib/auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { env } from "@/lib/env";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyTelegramInitData } from "@/lib/telegram";
import { resolveTelegramIdentity, TelegramIdentityConflict } from "@/lib/telegram-identity";
import { consumeRateLimit, getClientIp, telegramAuthRateLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const requestId = getRequestId(request), route = "/api/telegram/auth";
  try {
    if (!env.TELEGRAM_BOT_TOKEN) return apiError(MSG.TELEGRAM_NOT_CONFIGURED, "CONFIG_ERROR", 500, undefined, requestId);
    const limit = await consumeRateLimit(telegramAuthRateLimiter, getClientIp(request));
    if (!limit.success) return apiError(MSG.TOO_MANY_LOGIN_ATTEMPTS, "VALIDATION_ERROR", 429, { retryAfterMs: limit.retryAfterMs }, requestId);
    const body = await readJsonBody(request) as { initDataRaw?: unknown } | null;
    if (typeof body?.initDataRaw !== "string" || !body.initDataRaw || body.initDataRaw.length > 16384) return apiError(MSG.TELEGRAM_INIT_DATA_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);
    let profile;
    try { profile = verifyTelegramInitData(body.initDataRaw, env.TELEGRAM_BOT_TOKEN).user; }
    catch { return apiError(MSG.TELEGRAM_INVALID_SIGNATURE, "UNAUTHORIZED", 401, undefined, requestId); }
    if (!profile || !Number.isSafeInteger(profile.id) || profile.id <= 0) return apiError(MSG.TELEGRAM_USER_MISSING, "BAD_REQUEST", 400, undefined, requestId);
    const user = await resolveTelegramIdentity(profile);
    const token = await createSessionToken({ sub: user.id, email: user.email, sv: user.sessionVersion });
    await setAuthCookie(token);
    logger.info({ area: "api", route, requestId, message: "Telegram auth success", status: 200 });
    return apiSuccess({ userId: user.id }, 200, requestId);
  } catch (error) {
    if (error instanceof TelegramIdentityConflict) return apiError(MSG.TELEGRAM_IDENTITY_CONFLICT, "CONFLICT", 409, undefined, requestId);
    if (error instanceof ConfigError) return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    logger.error({ area: "api", route, requestId, message: "Telegram auth did not create a session", code: "AUTH_INCOMPLETE", status: 500 });
    return apiError(MSG.TELEGRAM_AUTH_FAILED, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
