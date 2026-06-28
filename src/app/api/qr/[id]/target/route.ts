import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { updateDynamicTargetSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/target";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
    }
    const parsed = updateDynamicTargetSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({
      where: { id },
    });
    if (!qr) {
      return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC") {
      return apiError(MSG.ONLY_DYNAMIC_QR_UPDATE, "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    await db.qrCode.update({
      where: { id },
      data: {
        currentTargetUrl: parsed.data.targetUrl,
        revisions: {
          create: {
            changedById: user.id,
            destinationUrl: parsed.data.targetUrl,
            encodedContent: qr.encodedContent,
          },
        },
      },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "Dynamic target updated",
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
      message: "Unexpected dynamic target update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.COULD_NOT_UPDATE_TARGET, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
