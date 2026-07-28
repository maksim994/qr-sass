import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYandexAuthConfig } from "@/lib/yandex-auth";
import { MSG } from "@/lib/user-messages";

const STATE_COOKIE = "yandex_oauth_state";
const MODE_COOKIE = "yandex_oauth_mode";
const STATE_MAX_AGE = 60 * 10;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "link" ? "link" : "login";

    if (mode === "link") {
      const session = await getSession();
      if (!session?.sub) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    const config = getYandexAuthConfig();
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STATE_MAX_AGE,
    });
    cookieStore.set(MODE_COOKIE, mode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STATE_MAX_AGE,
    });

    const authUrl = new URL("https://oauth.yandex.ru/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    authUrl.searchParams.set("scope", "login:email");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(MSG.YANDEX_AUTH_NOT_CONFIGURED)}`, request.url));
  }
}
