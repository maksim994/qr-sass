import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";

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
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const trackingPixels: Record<string, string | null> = {};
    if (raw.metaPixelId !== undefined) trackingPixels.metaPixelId = typeof raw.metaPixelId === "string" && raw.metaPixelId.trim() ? raw.metaPixelId.trim() : null;
    if (raw.ga4Id !== undefined) trackingPixels.ga4Id = typeof raw.ga4Id === "string" && raw.ga4Id.trim() ? raw.ga4Id.trim() : null;
    if (raw.gtmId !== undefined) trackingPixels.gtmId = typeof raw.gtmId === "string" && raw.gtmId.trim() ? raw.gtmId.trim() : null;
    if (raw.ymCounterId !== undefined) trackingPixels.ymCounterId = typeof raw.ymCounterId === "string" && raw.ymCounterId.trim() ? raw.ymCounterId.trim() : null;
    if (raw.vkPixelId !== undefined) trackingPixels.vkPixelId = typeof raw.vkPixelId === "string" && raw.vkPixelId.trim() ? raw.vkPixelId.trim() : null;

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC" || qr.contentType !== "URL") {
      return apiError("Tracking pixels only for dynamic URL QR.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const currentPayload = (qr.payload as Record<string, unknown>) ?? {};
    const curr = (currentPayload.trackingPixels as Record<string, unknown>) ?? {};
    const newTrackingPixels: Record<string, string> = {};
    const v = (key: "metaPixelId" | "ga4Id" | "gtmId" | "ymCounterId" | "vkPixelId") => {
      if (raw[key] !== undefined) return trackingPixels[key];
      return (curr[key] as string) ?? null;
    };
    const m = v("metaPixelId");
    const g = v("ga4Id");
    const t = v("gtmId");
    const ym = v("ymCounterId");
    const vk = v("vkPixelId");
    if (m) newTrackingPixels.metaPixelId = m;
    if (g) newTrackingPixels.ga4Id = g;
    if (t) newTrackingPixels.gtmId = t;
    if (ym) newTrackingPixels.ymCounterId = ym;
    if (vk) newTrackingPixels.vkPixelId = vk;

    const newPayload = { ...currentPayload };
    if (Object.keys(newTrackingPixels).length === 0) {
      delete newPayload.trackingPixels;
    } else {
      newPayload.trackingPixels = newTrackingPixels;
    }

    await db.qrCode.update({
      where: { id },
      data: { payload: newPayload as object },
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
    return apiError("Could not update tracking pixels.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
