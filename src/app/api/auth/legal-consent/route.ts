import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/rate-limit";
import { MSG } from "@/lib/user-messages";
import { postLoginRedirect, recordUserLegalConsent, userNeedsConsentRenewal } from "@/lib/legal-consent";
import { getValidationErrorMessage, legalConsentRenewSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/legal-consent";

  const session = await getSession();
  if (!session?.sub) {
    return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  }

  const raw = await readJsonBody(request);
  if (!raw) {
    return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
  }

  const parsed = legalConsentRenewSchema.safeParse(raw);
  if (!parsed.success) {
    const message = getValidationErrorMessage(parsed.error) ?? MSG.INVALID_PAYLOAD;
    return apiError(message, "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
  }

  const stillNeeds = await userNeedsConsentRenewal(session.sub);
  if (!stillNeeds) {
    return apiSuccess({ redirectTo: "/dashboard" }, 200, requestId);
  }

  const ip = getClientIp(request);
  await recordUserLegalConsent({
    userId: session.sub,
    ipAddress: ip,
    source: "RENEWAL",
    newsletterOptIn: parsed.data.newsletter ?? false,
  });

  logger.info({ area: "api", route, message: "Legal consent renewed", requestId, status: 200 });
  return apiSuccess({ redirectTo: postLoginRedirect(false) }, 200, requestId);
}
