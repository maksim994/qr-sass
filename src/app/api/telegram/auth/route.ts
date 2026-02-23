import { createSessionToken, setAuthCookie } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyTelegramInitData, verifyTelegramInitDataFallback } from "@/lib/telegram";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/telegram/auth";
  const body = (await readJsonBody(request)) as { initDataRaw?: string } | null;
  try {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return apiError("TELEGRAM_BOT_TOKEN is not configured.", "CONFIG_ERROR", 500, undefined, requestId);
    }

    if (!body?.initDataRaw) {
      return apiError("initDataRaw is required.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const parsed = verifyTelegramInitData(body.initDataRaw, env.TELEGRAM_BOT_TOKEN);
    const tgUser = parsed.user;
    if (!tgUser) {
      return apiError("User data is missing.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const db = getDb();
    const email = `tg-${tgUser.id}@telegram.local`;
    const user = await db.user.upsert({
      where: { email },
      update: {
        name: [tgUser.firstName, tgUser.lastName].filter(Boolean).join(" "),
      },
      create: {
        email,
        name: [tgUser.firstName, tgUser.lastName].filter(Boolean).join(" "),
        passwordHash: "telegram-auth",
        memberships: {
          create: {
            role: "OWNER",
            workspace: {
              create: {
                name: `${tgUser.firstName || "Telegram"} Workspace`,
                slug: `tg-${tgUser.id}`,
              },
            },
          },
        },
      },
    });

    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    logger.info({ area: "api", route, requestId, message: "Telegram auth success", status: 200 });
    return apiSuccess({ userId: user.id }, 200, requestId);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    if (!body?.initDataRaw || !env.TELEGRAM_BOT_TOKEN) {
      return apiError("Telegram auth failed.", "INTERNAL_ERROR", 500, undefined, requestId);
    }
    if (!verifyTelegramInitDataFallback(body.initDataRaw, env.TELEGRAM_BOT_TOKEN)) {
      return apiError("Invalid init data signature.", "UNAUTHORIZED", 401, undefined, requestId);
    }
    logger.warn({
      area: "api",
      route,
      requestId,
      message: "Telegram fallback auth path used",
      code: "FALLBACK_AUTH",
      status: 200,
    });
    return apiSuccess({ fallback: true }, 200, requestId);
  }
}
