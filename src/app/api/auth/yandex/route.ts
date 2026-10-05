import { getDb } from "@/lib/db";
import { legalReceipt, oauthStateHash } from "@/lib/legal-acceptance";
import { registrationLegalSchema, getValidationErrorMessage } from "@/lib/validation";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { consumeRateLimit, getClientIp, registerRateLimiter } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYandexAuthConfig } from "@/lib/yandex-auth";
import { MSG } from "@/lib/user-messages";
import { safePostAuthPath } from "@/lib/safe-redirect";

const STATE_COOKIE = "yandex_oauth_state";
const MODE_COOKIE = "yandex_oauth_mode";
const NEXT_COOKIE = "yandex_oauth_next";
const STATE_MAX_AGE = 60 * 10;

const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: STATE_MAX_AGE,
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "link" ? "link" : "login";
    const nextPath = safePostAuthPath(url.searchParams.get("next"), "/dashboard");

    if (mode === "link") {
      const session = await getSession();
      if (!session?.sub) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    const config = getYandexAuthConfig();
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, oauthCookieOptions);
    cookieStore.set(MODE_COOKIE, mode, oauthCookieOptions);
    if (nextPath !== "/dashboard") {
      cookieStore.set(NEXT_COOKIE, encodeURIComponent(nextPath), oauthCookieOptions);
    } else {
      cookieStore.delete(NEXT_COOKIE);
    }

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

// Separate registration endpoint: CSRF is checked by the shared middleware.
export async function POST(request: Request) {
  const limit = await consumeRateLimit(registerRateLimiter, getClientIp(request));
  if (!limit.success) return apiError(MSG.TOO_MANY_REGISTER_ATTEMPTS, "VALIDATION_ERROR", 429);
  const raw = await readJsonBody(request);
  const parsed = registrationLegalSchema.safeParse(raw);
  if (!parsed.success) return apiError(getValidationErrorMessage(parsed.error) ?? MSG.DATA_CONSENT_REQUIRED, "VALIDATION_ERROR", 400);
  try {
    const config = getYandexAuthConfig();
    const nextPath = safePostAuthPath(
      typeof raw === "object" && raw !== null && "next" in raw && typeof raw.next === "string" ? raw.next : undefined,
      "/dashboard",
    );
    const state = crypto.randomUUID();
    const receipt = legalReceipt("yandex");
    const db = getDb();
    await db.oAuthLegalIntent.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.oAuthLegalIntent.create({ data: {
      stateHash: oauthStateHash(state), version: receipt.version, documents: receipt.documents,
      acceptedAt: receipt.acceptedAt, expiresAt: new Date(Date.now() + STATE_MAX_AGE * 1000),
    } });
    const jar = await cookies();
    jar.set(STATE_COOKIE, state, oauthCookieOptions);
    jar.set(MODE_COOKIE, "register", oauthCookieOptions);
    jar.set(NEXT_COOKIE, encodeURIComponent(nextPath), oauthCookieOptions);
    const authUrl = new URL("https://oauth.yandex.ru/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    authUrl.searchParams.set("scope", "login:email");
    authUrl.searchParams.set("state", state);
    return apiSuccess({ url: authUrl.toString() });
  } catch {
    return apiError(MSG.YANDEX_AUTH_FAILED, "INTERNAL_ERROR", 500);
  }
}
