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
  const route = "/api/qr/[id]/smart-redirect";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody<Record<string, unknown>>(request);
    if (!raw || typeof raw !== "object") {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const smartRedirect: Record<string, string> = {};
    if (raw.default !== undefined) {
      if (raw.default === "" || raw.default === null) {
        delete smartRedirect.default;
      } else if (isValidUrl(raw.default)) {
        smartRedirect.default = raw.default as string;
      }
    }
    if (raw.ios !== undefined && isValidUrl(raw.ios)) smartRedirect.ios = raw.ios as string;
    if (raw.android !== undefined && isValidUrl(raw.android)) smartRedirect.android = raw.android as string;
    if (raw.desktop !== undefined && isValidUrl(raw.desktop)) smartRedirect.desktop = raw.desktop as string;

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC" || qr.contentType !== "URL") {
      return apiError("Smart redirect is only for dynamic URL QR.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const currentPayload = (qr.payload as Record<string, unknown>) ?? {};
    const newPayload = { ...currentPayload };
    if (Object.keys(smartRedirect).length === 0) {
      delete newPayload.smartRedirect;
    } else {
      newPayload.smartRedirect = smartRedirect;
    }

    await db.qrCode.update({
      where: { id },
      data: { payload: newPayload as object },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "Smart redirect updated",
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
      message: "Smart redirect update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not update smart redirect.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
