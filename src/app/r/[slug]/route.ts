import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { trackScan } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, redirectRateLimiter } from "@/lib/rate-limit";
import { isSafeUrl } from "@/lib/url";
import { env } from "@/lib/env";
import { getSession } from "@/lib/auth";
import { sanitizeTrackingPixels, trackingPixelsHtml } from "@/lib/tracking-pixels";
import { qrUnavailablePath } from "@/lib/qr-lifetime-policy";
import { hasQrConsent, qrConsentCookieName, requiredConsentVersion } from "@/lib/qr-consent";
import { accessCookieFor, evaluateQrPublicAccess, qrPublicUnavailablePath } from "@/lib/qr-public-access";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function htmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function passwordGateHtml(slug: string, error?: string) {
  const errMsg =
    error === "invalid_password"
      ? "Неверный пароль. Попробуйте ещё раз."
      : error === "rate_limited"
        ? "Слишком много попыток. Подождите и попробуйте снова."
        : "";
  const safeSlug = htmlAttr(slug);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Введите пароль</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8fafc"><div style="background:#fff;padding:2rem;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:20rem;width:100%"><h1 style="margin:0 0 1rem;font-size:1.25rem">Введите пароль</h1>${errMsg ? `<p style="color:#b91c1c;font-size:0.875rem;margin-bottom:1rem">${errMsg}</p>` : ""}<form method="post" action="/api/qr/verify-password" style="display:flex;flex-direction:column;gap:1rem"><input type="hidden" name="code" value="${safeSlug}"><input type="password" name="password" placeholder="Пароль" required style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:0.5rem"><button type="submit" style="padding:0.5rem 1rem;background:#2563eb;color:#fff;border:none;border-radius:0.5rem;font-weight:600;cursor:pointer">Войти</button></form></div></body></html>`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const ip = getClientIp(request);
    const limited = await consumeRateLimit(redirectRateLimiter, ip);
    if (!limited.success) {
      return new NextResponse("Слишком много запросов. Попробуйте позже.", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limited.retryAfterMs ?? 60000) / 1000)),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const { slug } = await context.params;
    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: {
        shortCode: slug,
        kind: "DYNAMIC",
      },
      select: {
        id: true,
        currentTargetUrl: true,
        payload: true,
        expireAt: true,
        maxScans: true,
        passwordHash: true,
        isArchived: true,
        shortCode: true,
      },
    });

    if (!qr) {
      logger.warn({
        area: "api",
        route: "/r/[slug]",
        message: "Dynamic QR target not found",
        code: "NOT_FOUND",
        status: 302,
        details: { slug },
      });
      return NextResponse.redirect(new URL(qrUnavailablePath("missing"), env.APP_URL));
    }

    const scanCount = await db.scanEvent.count({ where: { qrCodeId: qr.id } });
    const cookieStore = await cookies();
    const access = await evaluateQrPublicAccess({
      qr,
      scanCount,
      accessToken: cookieStore.get(accessCookieFor(slug))?.value,
    });
    if (!access.ok) {
      if (access.reason === "password") {
        const { searchParams } = new URL(request.url || `http://localhost/r/${slug}`);
        const error = searchParams.get("error");
        return new NextResponse(passwordGateHtml(slug, error ?? undefined), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
        });
      }
      return NextResponse.redirect(new URL(qrPublicUnavailablePath(access.reason), env.APP_URL));
    }

    const payload = (qr?.payload as Record<string, unknown>) ?? {};
    const smartRedirect = payload.smartRedirect as { default?: string; ios?: string; android?: string; desktop?: string } | undefined;
    const abTest = payload.abTest as { urlA?: string; urlB?: string } | undefined;
    const ua = request.headers.get("user-agent") ?? "";
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    let targetUrl = qr?.currentTargetUrl ?? "";
    let abVariant: "A" | "B" | null = null;

    if (smartRedirect && typeof smartRedirect === "object") {
      if (isIos && smartRedirect.ios) {
        targetUrl = smartRedirect.ios;
      } else if (isAndroid && smartRedirect.android) {
        targetUrl = smartRedirect.android;
      } else if (!/Mobile|Android|iPhone|iPad|iPod/i.test(ua) && smartRedirect.desktop) {
        targetUrl = smartRedirect.desktop;
      } else if (smartRedirect.default) {
        targetUrl = smartRedirect.default;
      }
    }

    if (abTest && typeof abTest === "object" && abTest.urlA && abTest.urlB) {
      const cookieStore = await cookies();
      const cookieName = `ab_variant_${slug}`;
      const existing = cookieStore.get(cookieName)?.value;
      if (existing === "A" || existing === "B") {
        abVariant = existing;
        targetUrl = existing === "A" ? abTest.urlA : abTest.urlB;
      } else {
        abVariant = Math.random() < 0.5 ? "A" : "B";
        targetUrl = abVariant === "A" ? abTest.urlA : abTest.urlB;
        cookieStore.set(cookieName, abVariant, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }
    }

    if (!targetUrl && typeof payload.url === "string" && payload.url.trim()) {
      targetUrl = payload.url.trim();
    }

    if (!targetUrl) {
      logger.warn({
        area: "api",
        route: "/r/[slug]",
        message: "Dynamic QR target not found",
        code: "NOT_FOUND",
        status: 302,
        details: { slug },
      });
      return NextResponse.redirect(new URL(qrUnavailablePath("missing"), env.APP_URL));
    }

    const gdprRequired = payload.gdprRequired === true;
    const consentVersion = requiredConsentVersion(payload);
    const cookieStoreForConsent = await cookies();
    const consented = hasQrConsent(
      cookieStoreForConsent.get(qrConsentCookieName(slug))?.value,
      consentVersion,
    );
    if (gdprRequired && !consented) {
      const gateUrl = new URL(`/g/${slug}`, env.APP_URL);
      gateUrl.searchParams.set("to", `/r/${slug}`);
      const policyUrl = typeof payload.gdprPolicyUrl === "string" ? payload.gdprPolicyUrl : "";
      if (policyUrl) gateUrl.searchParams.set("policy", policyUrl);
      return NextResponse.redirect(gateUrl);
    }

    if (!isSafeUrl(targetUrl)) {
      logger.warn({
        area: "api",
        route: "/r/[slug]",
        message: "Dynamic QR target URL has invalid scheme",
        code: "INVALID_URL",
        status: 302,
        details: { slug },
      });
      return NextResponse.redirect(new URL("/", env.APP_URL));
    }

    const session = await getSession().catch(() => null);
    after(() =>
      trackScan(qr.id, targetUrl, abVariant, session?.sub ?? null).catch((error) => {
        logger.error({
          area: "api",
          route: "/r/[slug]",
          message: "Failed to record scan event",
          code: "INTERNAL_ERROR",
          status: 500,
          details: error instanceof Error ? { message: error.message } : error,
        });
      })
    );

    const pixelsResult = sanitizeTrackingPixels(payload.trackingPixels);
    if (pixelsResult.ok && pixelsResult.value && consented) {
      return new NextResponse(trackingPixelsHtml(pixelsResult.value, targetUrl), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    return NextResponse.redirect(targetUrl);
  } catch (error) {
    logger.error({
      area: "api",
      route: "/r/[slug]",
      message: "Redirect route failed",
      code: "INTERNAL_ERROR",
      status: 302,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.redirect(new URL("/", env.APP_URL));
  }
}
