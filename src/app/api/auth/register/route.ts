import { nanoid } from "nanoid";
import { createSessionToken, hashPassword, setAuthCookie } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, registerRateLimiter } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/register";
  try {
    const ip = getClientIp(request);
    const limit = await consumeRateLimit(registerRateLimiter, ip);
    if (!limit.success) {
      return apiError(
        "Too many registration attempts. Try again later.",
        "VALIDATION_ERROR",
        429,
        limit.retryAfterMs ? { retryAfterMs: limit.retryAfterMs } : undefined,
        requestId
      );
    }

    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid payload.", "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const { email, name, password, workspaceName } = parsed.data;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("User already exists.", "CONFLICT", 409, undefined, requestId);
    }

    const passwordHash = await hashPassword(password);
    const workspaceSlug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${nanoid(6)}`;

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            workspace: {
              create: {
                name: workspaceName,
                slug: workspaceSlug,
              },
            },
          },
        },
      },
    });

    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    logger.info({ area: "api", route, message: "User registered", requestId, status: 200 });
    return apiSuccess({ userId: user.id }, 200, requestId);
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
      message: "Unexpected register error",
      requestId,
      code: "INTERNAL_ERROR",
      status: 500,
      details:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return apiError("Could not create account.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
