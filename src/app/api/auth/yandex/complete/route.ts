import { cookies } from "next/headers";
import { createSessionToken, setAuthCookie } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/rate-limit";
import { MSG } from "@/lib/user-messages";
import {
  clearYandexPendingCookie,
  postLoginRedirect,
  recordUserLegalConsent,
  userNeedsConsentRenewal,
  verifyYandexPendingToken,
} from "@/lib/legal-consent";
import { createYandexUser, findExistingYandexUser } from "@/lib/yandex-user";
import { getValidationErrorMessage, yandexConsentCompleteSchema } from "@/lib/validation";

const PENDING_YANDEX_COOKIE = "yandex_pending_registration";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/yandex/complete";

  const raw = await readJsonBody(request);
  if (!raw) {
    return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
  }

  const parsed = yandexConsentCompleteSchema.safeParse(raw);
  if (!parsed.success) {
    const message = getValidationErrorMessage(parsed.error) ?? MSG.INVALID_PAYLOAD;
    return apiError(message, "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_YANDEX_COOKIE)?.value;
  if (!token) {
    return apiError("Сессия регистрации через Яндекс истекла. Повторите вход.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const pending = await verifyYandexPendingToken(token);
  if (!pending) {
    await clearYandexPendingCookie();
    return apiError("Сессия регистрации через Яндекс истекла. Повторите вход.", "BAD_REQUEST", 400, undefined, requestId);
  }

  try {
    const already = await findExistingYandexUser({
      yandexId: pending.yandexId,
      email: pending.email,
      name: pending.name,
    });
    if (already) {
      await clearYandexPendingCookie();
      return apiError("Аккаунт уже существует. Войдите через Яндекс или email.", "CONFLICT", 409, undefined, requestId);
    }

    const user = await createYandexUser({
      yandexId: pending.yandexId,
      email: pending.email,
      name: pending.name,
    });

    const ip = getClientIp(request);
    await recordUserLegalConsent({
      userId: user.id,
      ipAddress: ip,
      source: "YANDEX_REGISTER",
      newsletterOptIn: parsed.data.newsletter ?? false,
    });

    await clearYandexPendingCookie();

    const sessionToken = await createSessionToken({ sub: user.id, email: user.email });
    await setAuthCookie(sessionToken);

    const needsRenewal = await userNeedsConsentRenewal(user.id);
    logger.info({ area: "api", route, message: "Yandex register with consent", requestId, status: 200 });

    return apiSuccess({ userId: user.id, redirectTo: postLoginRedirect(needsRenewal) }, 200, requestId);
  } catch (error) {
    logger.error({
      area: "api",
      route,
      message: "Yandex complete failed",
      requestId,
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return apiError(MSG.COULD_NOT_CREATE_ACCOUNT, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
