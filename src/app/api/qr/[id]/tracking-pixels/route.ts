import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sanitizeTrackingPixels } from "@/lib/tracking-pixels";
import { stampTrackingConsentVersion } from "@/lib/qr-consent";
import { assertAllowsDynamic } from "@/lib/entitlements";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/tracking-pixels";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody<Record<string, unknown>>(request);
    if (!raw || typeof raw !== "object") {
      return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
    }

    if (typeof raw.gtmId === "string" && raw.gtmId.trim()) {
      return apiError(MSG.GTM_DISABLED, "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const sanitized = sanitizeTrackingPixels(raw);
    if (!sanitized.ok) {
      return apiError(sanitized.error, "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) {
      return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC" || qr.contentType !== "URL") {
      return apiError(MSG.TRACKING_PIXELS_DYNAMIC_ONLY, "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const gate = await assertAllowsDynamic(qr.workspaceId);
    if (!gate.ok) {
      return apiError(MSG.PLAN_DYNAMIC_REQUIRED, "FORBIDDEN", 403, undefined, requestId);
    }

    const currentPayload = (qr.payload as Record<string, unknown>) ?? {};
    const newPayload = { ...currentPayload };
    if (!sanitized.value) {
      delete newPayload.trackingPixels;
    } else {
      newPayload.trackingPixels = sanitized.value;
    }
    const payload = stampTrackingConsentVersion(currentPayload, newPayload);

    await db.qrCode.update({
      where: { id },
      data: { payload: payload as object },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "Tracking pixels updated",
      status: 200,
      details: { id },
    });
    return apiSuccess({ updated: true }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Tracking pixels update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.COULD_NOT_UPDATE_TRACKING, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
