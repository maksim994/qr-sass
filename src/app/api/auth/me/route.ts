import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/me";
  try {
    const session = await getSession();
    if (!session?.sub) {
      return apiSuccess({ user: null }, 200, requestId);
    }

    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          select: {
            role: true,
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return apiSuccess({ user }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({
        area: "api",
        route,
        message: error.message,
        requestId,
        code: error.code,
        status: 500,
      });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      message: "Unexpected me endpoint error",
      requestId,
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not read session.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
