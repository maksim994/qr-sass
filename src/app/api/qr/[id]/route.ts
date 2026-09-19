import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { evaluateScannability } from "@/lib/scannability";
import { encodeQrContent, needsHostedPage } from "@/lib/qr";
import { applyTrackingPixelsToPayload } from "@/lib/tracking-pixels";
import { stampTrackingConsentVersion } from "@/lib/qr-consent";
import { collectUploadIds, uploadsBelongToWorkspace } from "@/lib/tenant";
import { updateQrSchema, validatePayloadUrls, payloadMeetsType } from "@/lib/validation";
import { assertAllowsDynamic, getEntitlements } from "@/lib/entitlements";
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

    const entitlements = await getEntitlements(qr.workspaceId);
    return apiSuccess({ qr: entitlements.allowsAnalytics ? qr : { ...qr, scanEvents: [] } }, 200, requestId);
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
    let nextPayload =
      data.payload != null ? ({ ...existingPayload, ...data.payload } as Record<string, unknown>) : existingPayload;
    if (data.payload != null) {
      const pixels = applyTrackingPixelsToPayload(nextPayload);
      if (!pixels.ok) {
        return apiError(pixels.error, "VALIDATION_ERROR", 400, undefined, requestId);
      }
      nextPayload = stampTrackingConsentVersion(existingPayload, pixels.payload);
    }

    const isHosted = needsHostedPage(qr.contentType);
    const usesVcardDownload = qr.contentType === "VCARD";
    const isManaged = qr.kind === "DYNAMIC" || isHosted || usesVcardDownload;

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
    if (data.payload != null && !payloadMeetsType(nextPayload, qr.contentType)) {
      return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400, undefined, requestId);
    }

    if (
      !(await uploadsBelongToWorkspace(
        db,
        collectUploadIds(
          data.payload != null ? nextPayload : {},
          data.style != null ? (data.style as Record<string, unknown>) : null,
        ),
        qr.workspaceId,
      ))
    ) {
      return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403, undefined, requestId);
    }

    if (data.style != null) {
      const score = evaluateScannability(data.style);
      if (!score.safeToUse) {
        return apiError(MSG.SCANNABILITY_TOO_LOW, "VALIDATION_ERROR", 400, { score }, requestId);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name != null) updateData.name = data.name;
    if (data.payload != null) updateData.payload = nextPayload as object;
    if (data.style != null) updateData.styleConfig = data.style as object;

    if (isManaged) {
      const changesPaidFeature =
        data.payload != null ||
        data.expireAt !== undefined ||
        data.maxScans !== undefined ||
        data.password !== undefined;
      if (changesPaidFeature) {
        const gate = await assertAllowsDynamic(qr.workspaceId);
        if (!gate.ok) {
          return apiError(MSG.PLAN_DYNAMIC_REQUIRED, "FORBIDDEN", 403, undefined, requestId);
        }
      }
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
