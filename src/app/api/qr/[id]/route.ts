import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { evaluateScannability } from "@/lib/scannability";
import { encodeQrContent, needsHostedPage } from "@/lib/qr";
import { updateQrSchema, validatePayloadUrls } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

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
      return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
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
    return apiError(MSG.COULD_NOT_READ_QR, "INTERNAL_ERROR", 500, undefined, requestId);
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
    if (!raw) return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);

    const parsed = updateQrSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const data = parsed.data;
    const existingPayload = (qr.payload as Record<string, unknown>) ?? {};
    const nextPayload =
      data.payload != null ? ({ ...existingPayload, ...data.payload } as Record<string, unknown>) : existingPayload;

    if (
      data.payload != null &&
      !validatePayloadUrls(nextPayload, qr.contentType)
    ) {
      return apiError(
        MSG.INVALID_PAYLOAD_URL,
        "VALIDATION_ERROR",
        400,
        undefined,
        requestId
      );
    }

    if (data.style != null) {
      const score = evaluateScannability({
        foreground: data.style.dotColor,
        background: data.style.bgTransparent ? "#ffffff" : data.style.bgColor,
        margin: data.style.margin,
        logoScale: data.style.logoScale,
      });
      if (!score.safeToUse) {
        return apiError(MSG.SCANNABILITY_TOO_LOW, "VALIDATION_ERROR", 400, { score }, requestId);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name != null) updateData.name = data.name;
    if (data.payload != null) updateData.payload = nextPayload as object;
    if (data.style != null) updateData.styleConfig = data.style as object;

    if (qr.kind === "DYNAMIC") {
      if (data.expireAt !== undefined) updateData.expireAt = data.expireAt ? new Date(data.expireAt) : null;
      if (data.maxScans !== undefined) updateData.maxScans = data.maxScans;
      if (data.password !== undefined) {
        if (data.password.length === 0) {
          updateData.passwordHash = null;
        } else {
          updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
      }
    }

    const payloadChanged = data.payload != null;
    const isHosted = needsHostedPage(qr.contentType);
    const usesVcardDownload = qr.contentType === "VCARD";

    if (usesVcardDownload && !qr.shortCode) {
      const shortCode = nanoid(8);
      updateData.shortCode = shortCode;
      updateData.encodedContent = `${process.env.APP_URL ?? "http://localhost:3000"}/v/${shortCode}`;
    } else if (payloadChanged && qr.kind === "STATIC" && !isHosted && !usesVcardDownload) {
      const encoded = encodeQrContent(qr.contentType, nextPayload);
      if (!encoded) {
        return apiError(MSG.COULD_NOT_ENCODE_PAYLOAD, "VALIDATION_ERROR", 400, undefined, requestId);
      }
      updateData.encodedContent = encoded;
    }

    if (payloadChanged && qr.kind === "DYNAMIC" && !isHosted && qr.contentType === "URL") {
      const url = typeof nextPayload.url === "string" ? nextPayload.url.trim() : "";
      if (url) updateData.currentTargetUrl = url;
    }

    if (Object.keys(updateData).length === 0) {
      return apiSuccess({ updated: false }, 200, requestId);
    }

    await db.qrCode.update({
      where: { id },
      data: updateData,
    });

    if (payloadChanged && qr.kind === "DYNAMIC") {
      await db.qrRevision.create({
        data: {
          qrCodeId: id,
          changedById: user.id,
          destinationUrl:
            typeof nextPayload.url === "string"
              ? nextPayload.url
              : qr.currentTargetUrl,
          encodedContent: qr.encodedContent,
        },
      });
    }

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
    return apiError(MSG.COULD_NOT_UPDATE_QR, "INTERNAL_ERROR", 500, undefined, requestId);
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
    if (!qr) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

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
    return apiError(MSG.COULD_NOT_DELETE_QR, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
