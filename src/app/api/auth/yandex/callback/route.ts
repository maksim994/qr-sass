import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, getSession, setAuthCookie } from "@/lib/auth";
import {
  exchangeYandexCode,
  findOrCreateYandexUser,
  getYandexProfile,
  linkYandexToUser,
} from "@/lib/yandex-auth";
import { MSG } from "@/lib/user-messages";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/api-response";

const STATE_COOKIE = "yandex_oauth_state";
const MODE_COOKIE = "yandex_oauth_mode";

function loginRedirect(request: Request, message: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
}

function profileRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/dashboard/profile", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const mode = cookieStore.get(MODE_COOKIE)?.value === "link" ? "link" : "login";
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(MODE_COOKIE);

  if (error) {
    logger.warn({ area: "api", route: "/api/auth/yandex/callback", requestId, message: "Yandex rejected authorization", code: error, status: 302 });
    if (mode === "link") {
      return profileRedirect(request, { yandex: "error", message: MSG.YANDEX_AUTH_FAILED });
    }
    return loginRedirect(request, MSG.YANDEX_AUTH_FAILED);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    if (mode === "link") {
      return profileRedirect(request, { yandex: "error", message: MSG.YANDEX_AUTH_INVALID_STATE });
    }
    return loginRedirect(request, MSG.YANDEX_AUTH_INVALID_STATE);
  }

  try {
    const accessToken = await exchangeYandexCode(code);
    const profile = await getYandexProfile(accessToken);

    if (mode === "link") {
      const session = await getSession();
      if (!session?.sub) {
        return loginRedirect(request, MSG.UNAUTHORIZED);
      }
      await linkYandexToUser(session.sub, profile);
      logger.info({ area: "api", route: "/api/auth/yandex/callback", requestId, message: "Yandex link success", status: 302 });
      return profileRedirect(request, { yandex: "linked" });
    }

    const user = await findOrCreateYandexUser(profile);
    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    logger.info({ area: "api", route: "/api/auth/yandex/callback", requestId, message: "Yandex auth success", status: 302 });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (authError) {
    logger.error({
      area: "api",
      route: "/api/auth/yandex/callback",
      requestId,
      message: "Yandex auth failed",
      code: "YANDEX_AUTH_FAILED",
      status: 302,
      details: authError instanceof Error ? { message: authError.message } : authError,
    });
    const safeMessages = new Set<string>([
      MSG.YANDEX_AUTH_NOT_CONFIGURED,
      MSG.YANDEX_AUTH_FAILED,
      MSG.YANDEX_AUTH_INVALID_STATE,
      MSG.YANDEX_EMAIL_REQUIRED,
      MSG.YANDEX_ALREADY_LINKED,
    ]);
    const message = authError instanceof Error && safeMessages.has(authError.message)
      ? authError.message
      : MSG.YANDEX_AUTH_FAILED;

    if (mode === "link") {
      return profileRedirect(request, { yandex: "error", message });
    }
    return loginRedirect(request, message);
  }
}
