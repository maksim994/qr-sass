import { createSessionToken, setAuthCookie, verifyPassword } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/auth/login";
  try {
    const raw = await readJsonBody(request);
    if (!raw) {
      return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Invalid payload.", "VALIDATION_ERROR", 400, parsed.error.flatten(), requestId);
    }

    const db = getDb();
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user) {
      return apiError("Invalid credentials.", "UNAUTHORIZED", 401, undefined, requestId);
    }

    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return apiError("Invalid credentials.", "UNAUTHORIZED", 401, undefined, requestId);
    }

    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    logger.info({ area: "api", route, message: "User logged in", requestId, status: 200 });
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
      message: "Unexpected login error",
      requestId,
      code: "INTERNAL_ERROR",
      status: 500,
      details:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return apiError("Could not sign in.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
