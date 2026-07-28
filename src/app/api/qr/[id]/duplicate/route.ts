import { nanoid } from "nanoid";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertCanCreateQrCodes } from "@/lib/plans";
import { needsHostedPage } from "@/lib/qr";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/duplicate";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const db = getDb();
    const source = await db.qrCode.findUnique({ where: { id } });
    if (!source || source.isArchived) {
      return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }

    const membership = user.memberships.find((m) => m.workspaceId === source.workspaceId);
    if (!membership) return unauthorized();

    const workspace = await db.workspace.findUnique({
      where: { id: source.workspaceId },
      select: { plan: true },
    });

    const needsDynamic = source.kind === "DYNAMIC" || needsHostedPage(source.contentType) || source.contentType === "VCARD";
    const quota = await assertCanCreateQrCodes({
      workspaceId: source.workspaceId,
      planId: workspace?.plan,
      count: 1,
      needsDynamic,
    });
    if (!quota.ok) {
      return apiError(quota.message, "FORBIDDEN", 403, { code: quota.code }, requestId);
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const isHosted = needsHostedPage(source.contentType);
    const usesVcardDownload = source.contentType === "VCARD";
    const isDynamic = source.kind === "DYNAMIC" || isHosted;
    const shortCode = isDynamic || usesVcardDownload ? nanoid(8) : null;

    let encodedContent = source.encodedContent;
    if (usesVcardDownload && shortCode) {
      encodedContent = `${appUrl}/v/${shortCode}`;
    } else if (isHosted && shortCode) {
      encodedContent = `${appUrl}/p/${shortCode}`;
    } else if (isDynamic && shortCode) {
      encodedContent = `${appUrl}/r/${shortCode}`;
    }

    const copyName = `${source.name} (копия)`.slice(0, 120);

    const created = await db.qrCode.create({
      data: {
        workspaceId: source.workspaceId,
        projectId: source.projectId,
        createdById: user.id,
        kind: isDynamic ? "DYNAMIC" : "STATIC",
        contentType: source.contentType,
        name: copyName,
        shortCode,
        encodedContent,
        currentTargetUrl: source.currentTargetUrl,
        payload: source.payload ?? undefined,
        styleConfig: source.styleConfig ?? undefined,
        expireAt: source.expireAt,
        maxScans: source.maxScans,
        // Password is not copied for security — user can set again in settings.
        passwordHash: null,
        revisions: {
          create: {
            changedById: user.id,
            destinationUrl: source.currentTargetUrl,
            encodedContent,
          },
        },
      },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "QR duplicated",
      status: 200,
      details: { sourceId: source.id, qrId: created.id },
    });

    return apiSuccess({ qrId: created.id, shortCode: created.shortCode }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected QR duplicate error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.COULD_NOT_DUPLICATE_QR, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
