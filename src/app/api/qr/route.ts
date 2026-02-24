import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { encodeQrContent, needsHostedPage } from "@/lib/qr";
import { evaluateScannability } from "@/lib/scannability";
import { createQrSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return apiError("workspaceId is required.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === workspaceId);
    if (!isMember) return unauthorized();

    const db = getDb();
    const qrs = await db.qrCode.findMany({
      where: {
        workspaceId,
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { scanEvents: true },
        },
      },
      take: 100,
    });

    return apiSuccess({ items: qrs }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected QR list error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not load QR list.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }
    const parsed = createQrSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid payload.", "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const data = parsed.data;
    const membership = user.memberships.find((m) => m.workspaceId === data.workspaceId);
    if (!membership) return unauthorized();

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const isHosted = needsHostedPage(data.contentType);
    const isDynamic = data.kind === "DYNAMIC" || isHosted;
    const shortCode = isDynamic ? nanoid(8) : null;

    let encodedContent = "";
    if (!isHosted) {
      encodedContent = encodeQrContent(data.contentType, data.payload);
      if (!encodedContent) {
        return apiError("Could not encode payload.", "VALIDATION_ERROR", 400, undefined, requestId);
      }
    }

    const score = evaluateScannability({
      foreground: data.style.dotColor,
      background: data.style.bgTransparent ? "#ffffff" : data.style.bgColor,
      margin: data.style.margin,
      logoScale: data.style.logoScale,
    });

    if (!score.safeToUse) {
      return apiError("Scannability score too low.", "VALIDATION_ERROR", 400, { score }, requestId);
    }

    // For hosted types, the QR points to /p/[shortCode]
    // For dynamic types, the QR points to /r/[shortCode]
    // For static, QR encodes content directly
    let qrData: string;
    if (isHosted) {
      qrData = `${appUrl}/p/${shortCode}`;
    } else if (isDynamic) {
      qrData = `${appUrl}/r/${shortCode}`;
    } else {
      qrData = encodedContent;
    }

    const expireAt =
      data.expireAt && typeof data.expireAt === "string"
        ? (() => {
            const d = new Date(data.expireAt);
            return isNaN(d.getTime()) || d <= new Date() ? undefined : d;
          })()
        : undefined;
    const maxScans =
      typeof data.maxScans === "number" && Number.isInteger(data.maxScans) && data.maxScans >= 1
        ? data.maxScans
        : undefined;

    const passwordHash =
      isDynamic && data.password && typeof data.password === "string" && data.password.length >= 1
        ? await bcrypt.hash(data.password, 10)
        : undefined;

    const qr = await db.qrCode.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        createdById: user.id,
        kind: isDynamic ? "DYNAMIC" : "STATIC",
        contentType: data.contentType,
        name: data.name,
        shortCode,
        encodedContent: qrData,
        currentTargetUrl: isDynamic && !isHosted ? (data.payload.url as string | undefined) : null,
        payload: data.payload as object,
        styleConfig: data.style as object,
        expireAt: isDynamic ? expireAt : undefined,
        maxScans: isDynamic ? maxScans : undefined,
        passwordHash: isDynamic ? (passwordHash ?? null) : null,
        revisions: {
          create: {
            changedById: user.id,
            destinationUrl: isDynamic ? (data.payload.url as string | undefined) : null,
            encodedContent: isHosted ? qrData : encodedContent,
          },
        },
      },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "QR created",
      status: 200,
      details: { qrId: qr.id, kind: qr.kind, contentType: qr.contentType },
    });
    return apiSuccess({ score, qrId: qr.id, shortCode: qr.shortCode }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected QR create error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not create QR.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
