import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trackScan } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isSafeUrl } from "@/lib/url";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function passwordGateHtml(slug: string, error?: string) {
  const errMsg = error === "invalid_password" ? "Неверный пароль. Попробуйте ещё раз." : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Введите пароль</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8fafc"><div style="background:#fff;padding:2rem;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:20rem;width:100%"><h1 style="margin:0 0 1rem;font-size:1.25rem">Введите пароль</h1>${errMsg ? `<p style="color:#b91c1c;font-size:0.875rem;margin-bottom:1rem">${errMsg}</p>` : ""}<form method="post" action="/api/qr/verify-password" style="display:flex;flex-direction:column;gap:1rem"><input type="hidden" name="code" value="${slug}"><input type="hidden" name="redirectTo" value="/r/${slug}"><input type="password" name="password" placeholder="Пароль" required style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:0.5rem"><button type="submit" style="padding:0.5rem 1rem;background:#2563eb;color:#fff;border:none;border-radius:0.5rem;font-weight:600;cursor:pointer">Войти</button></form></div></body></html>`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: {
        shortCode: slug,
        kind: "DYNAMIC",
        isArchived: false,
      },
      select: {
        id: true,
        currentTargetUrl: true,
        payload: true,
        expireAt: true,
        maxScans: true,
        passwordHash: true,
      },
    });

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

    if (!qr || !targetUrl) {
      logger.warn({
        area: "api",
        route: "/r/[slug]",
        message: "Dynamic QR target not found",
        code: "NOT_FOUND",
        status: 302,
        details: { slug },
      });
      return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
    }

    if (qr.expireAt && new Date() > qr.expireAt) {
      return NextResponse.redirect(new URL("/expired", process.env.APP_URL ?? "http://localhost:3000"));
    }

    if (qr.maxScans != null && qr.maxScans > 0) {
      const scanCount = await db.scanEvent.count({ where: { qrCodeId: qr.id } });
      if (scanCount >= qr.maxScans) {
        return NextResponse.redirect(new URL("/expired", process.env.APP_URL ?? "http://localhost:3000"));
      }
    }

    if (qr.passwordHash) {
      const cookieStore = await cookies();
      const pwdCookie = cookieStore.get(`qr_pwd_${slug}`);
      if (!pwdCookie?.value) {
        const { searchParams } = new URL(request.url || `http://localhost/r/${slug}`);
        const error = searchParams.get("error");
        return new NextResponse(passwordGateHtml(slug, error ?? undefined), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    const gdprRequired = payload.gdprRequired === true;
    if (gdprRequired) {
      const cookieStore = await cookies();
      const gdprCookie = cookieStore.get("gdpr_consent");
      if (gdprCookie?.value !== "1") {
        const gateUrl = new URL(`/g/${slug}`, process.env.APP_URL ?? "http://localhost:3000");
        gateUrl.searchParams.set("to", `/r/${slug}`);
        const policyUrl = typeof payload.gdprPolicyUrl === "string" ? payload.gdprPolicyUrl : "";
        if (policyUrl) gateUrl.searchParams.set("policy", policyUrl);
        return NextResponse.redirect(gateUrl);
      }
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
      return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
    }

    await trackScan(qr.id, targetUrl, abVariant);

    const trackingPixels = payload.trackingPixels as { metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string } | undefined;
    const hasPixels = trackingPixels && typeof trackingPixels === "object" && (trackingPixels.metaPixelId || trackingPixels.ga4Id || trackingPixels.gtmId || trackingPixels.ymCounterId || trackingPixels.vkPixelId);
    if (hasPixels) {
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/</g, "\\u003c");
      const escapedUrl = targetUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      const metaId = trackingPixels.metaPixelId ? esc(trackingPixels.metaPixelId) : "";
      const metaScript = metaId
        ? `<!-- Meta Pixel --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaId}');fbq('track','PageView');</script>`
        : "";
      const ga4Script = trackingPixels.ga4Id
        ? `<!-- GA4 --><script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trackingPixels.ga4Id)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${encodeURIComponent(trackingPixels.ga4Id)}');</script>`
        : "";
      const gtmScript = trackingPixels.gtmId
        ? `<!-- GTM --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${encodeURIComponent(trackingPixels.gtmId)}');</script><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(trackingPixels.gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
        : "";
      const ymId = trackingPixels.ymCounterId ? esc(trackingPixels.ymCounterId) : "";
      const ymScript = ymId
        ? `<!-- Yandex Metrika --><script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym("${ymId}","init",{clickmap:true,webvisor:true});</script><noscript><div><img src="https://mc.yandex.ru/watch/${ymId}" style="position:absolute;left:-9999px;" alt="" /></div></noscript>`
        : "";
      const vkId = trackingPixels.vkPixelId ? esc(trackingPixels.vkPixelId) : "";
      const vkScript = vkId
        ? `<!-- VK Pixel --><div id="vk_api_transport"></div><script>window.vkAsyncInit=function(){try{var p=new VK.Pixel("${vkId}");p.Hit();}catch(e){}};(function(){var s=document.createElement("script");s.src="https://vk.com/js/api/openapi.js?169";s.async=true;(document.getElementById("vk_api_transport")||document.head).appendChild(s);})();</script>`
        : "";
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${escapedUrl}">${metaScript}${ga4Script}${gtmScript}${ymScript}${vkScript}</head><body><p>Перенаправление...</p><script>setTimeout(function(){location.replace("${esc(targetUrl)}");},150);</script></body></html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
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
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
  }
}
