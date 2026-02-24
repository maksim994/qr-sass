import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isSafeUrl } from "@/lib/url";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidUrl(s: unknown): boolean {
  return typeof s === "string" && s.length > 0 && isSafeUrl(s);
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/ab-test";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody<Record<string, unknown>>(request);
    if (!raw || typeof raw !== "object") {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const urlA = raw.urlA === "" || raw.urlA === null ? null : isValidUrl(raw.urlA) ? (raw.urlA as string) : undefined;
    const urlB = raw.urlB === "" || raw.urlB === null ? null : isValidUrl(raw.urlB) ? (raw.urlB as string) : undefined;

    if (urlA === undefined && raw.urlA !== undefined) {
      return apiError("urlA must be a valid https/http URL.", "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if (urlB === undefined && raw.urlB !== undefined) {
      return apiError("urlB must be a valid https/http URL.", "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if ((urlA && !urlB) || (!urlA && urlB)) {
      return apiError("Both urlA and urlB must be set or both cleared.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC" || qr.contentType !== "URL") {
      return apiError("A/B test only for dynamic URL QR.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const currentPayload = (qr.payload as Record<string, unknown>) ?? {};
    const newPayload = { ...currentPayload };
    if (urlA === null && urlB === null) {
      delete newPayload.abTest;
    } else if (urlA && urlB) {
      newPayload.abTest = { urlA, urlB };
    }

    await db.qrCode.update({
      where: { id },
      data: { payload: newPayload as object },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "A/B test updated",
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
      message: "A/B test update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not update A/B test.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
