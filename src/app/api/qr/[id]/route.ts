import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { updateQrSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const db = getDb();
    const qr = await db.qrCode.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        scanEvents: {
          orderBy: { scannedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    return apiSuccess({ qr }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected QR details error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not read QR details.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody(request);
    if (!raw) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);

    const parsed = updateQrSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid payload.", "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.name != null) updateData.name = data.name;
    if (data.payload != null) updateData.payload = data.payload as object;
    if (data.style != null) updateData.styleConfig = data.style as object;

    if (Object.keys(updateData).length === 0) {
      return apiSuccess({ updated: false }, 200, requestId);
    }

    await db.qrCode.update({
      where: { id },
      data: updateData,
    });

    logger.info({ area: "api", route, requestId, message: "QR updated", status: 200, details: { qrId: id } });
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
      message: "Unexpected QR update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not update QR.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    await db.qrCode.update({
      where: { id },
      data: { isArchived: true },
    });

    logger.info({ area: "api", route, requestId, message: "QR archived", status: 200, details: { qrId: id } });
    return apiSuccess({ deleted: true }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected QR delete error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not delete QR.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
