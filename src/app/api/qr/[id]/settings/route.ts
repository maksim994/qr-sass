import bcrypt from "bcryptjs";
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
  const route = "/api/qr/[id]/settings";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const raw = await readJsonBody<Record<string, unknown>>(request);
    if (!raw || typeof raw !== "object") {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    let expireAt: Date | null | undefined = undefined;
    if (raw.expireAt !== undefined) {
      if (raw.expireAt === "" || raw.expireAt === null) {
        expireAt = null;
      } else if (typeof raw.expireAt === "string") {
        const d = new Date(raw.expireAt);
        if (isNaN(d.getTime())) {
          return apiError("expireAt must be a valid ISO date string.", "VALIDATION_ERROR", 400, undefined, requestId);
        }
        if (d <= new Date()) {
          return apiError("expireAt must be in the future.", "VALIDATION_ERROR", 400, undefined, requestId);
        }
        expireAt = d;
      }
    }

    let maxScans: number | null | undefined = undefined;
    if (raw.maxScans !== undefined) {
      if (raw.maxScans === "" || raw.maxScans === null) {
        maxScans = null;
      } else {
        const n = Number(raw.maxScans);
        if (!Number.isInteger(n) || n < 1) {
          return apiError("maxScans must be a positive integer.", "VALIDATION_ERROR", 400, undefined, requestId);
        }
        maxScans = n;
      }
    }

    let passwordHash: string | null | undefined = undefined;
    if (raw.password !== undefined) {
      if (raw.password === "" || raw.password === null) {
        passwordHash = null;
      } else if (typeof raw.password === "string" && raw.password.length >= 1) {
        passwordHash = await bcrypt.hash(raw.password, 10);
      }
    }

    const db = getDb();
    const qr = await db.qrCode.findUnique({ where: { id } });
    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    if (qr.kind !== "DYNAMIC") {
      return apiError("Only dynamic QR can have expiry settings.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const data: { expireAt?: Date | null; maxScans?: number | null; passwordHash?: string | null } = {};
    if (raw.expireAt !== undefined) data.expireAt = expireAt ?? null;
    if (raw.maxScans !== undefined) data.maxScans = maxScans ?? null;
    if (raw.password !== undefined) data.passwordHash = passwordHash ?? null;

    let payloadUpdate: Record<string, unknown> | undefined;
    if (raw.gdprRequired !== undefined || raw.gdprPolicyUrl !== undefined) {
      const currentPayload = (qr.payload as Record<string, unknown>) ?? {};
      payloadUpdate = { ...currentPayload };
      if (raw.gdprRequired !== undefined) {
        payloadUpdate.gdprRequired = raw.gdprRequired === true || raw.gdprRequired === "true";
      }
      if (raw.gdprPolicyUrl !== undefined) {
        payloadUpdate.gdprPolicyUrl = typeof raw.gdprPolicyUrl === "string" ? raw.gdprPolicyUrl : null;
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (payloadUpdate) updateData.payload = payloadUpdate;
    await db.qrCode.update({
      where: { id },
      data: updateData,
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "QR settings updated",
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
      message: "Unexpected QR settings update error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not update settings.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
