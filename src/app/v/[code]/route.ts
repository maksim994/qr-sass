import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { buildVcard, getVcardFilename } from "@/lib/vcard";
import { logger } from "@/lib/logger";
import { trackScan } from "@/lib/analytics";
import { env } from "@/lib/env";
import { accessCookieFor, evaluateQrPublicAccess, qrPublicUnavailablePath } from "@/lib/qr-public-access";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function passwordGateHtml(code: string) {
  const safe = code.replace(/[^\w-]/g, "");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Введите пароль</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8fafc"><div style="background:#fff;padding:2rem;border-radius:1rem;max-width:20rem;width:100%"><h1 style="margin:0 0 1rem;font-size:1.25rem">Введите пароль</h1><form method="post" action="/api/qr/verify-password" style="display:flex;flex-direction:column;gap:1rem"><input type="hidden" name="code" value="${safe}"><input type="password" name="password" placeholder="Пароль" required style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:0.5rem"><button type="submit" style="padding:0.5rem 1rem;background:#2563eb;color:#fff;border:none;border-radius:0.5rem;font-weight:600;cursor:pointer">Войти</button></form></div></body></html>`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: {
        shortCode: code,
        contentType: "VCARD",
      },
      select: {
        id: true,
        name: true,
        payload: true,
        isArchived: true,
        expireAt: true,
        maxScans: true,
        passwordHash: true,
        shortCode: true,
      },
    });

    const scanCount = qr ? await db.scanEvent.count({ where: { qrCodeId: qr.id } }) : 0;
    const token = (await cookies()).get(accessCookieFor(code))?.value;
    const access = await evaluateQrPublicAccess({ qr, scanCount, accessToken: token });
    if (!access.ok) {
      if (access.reason === "password") {
        return new NextResponse(passwordGateHtml(code), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
        });
      }
      return NextResponse.redirect(new URL(qrPublicUnavailablePath(access.reason), env.APP_URL));
    }
    if (!qr) {
      return NextResponse.redirect(new URL(qrPublicUnavailablePath("missing"), env.APP_URL));
    }

    const payload = (qr.payload as Record<string, unknown> | null) ?? {};
    const vcard = buildVcard(payload);
    const filename = getVcardFilename(payload, qr.name || "contact");
    const utf8Filename = encodeURIComponent(filename);

    await trackScan(qr.id, `/v/${code}`).catch((error) => {
      logger.error({
        area: "api",
        route: "/v/[code]",
        message: "Failed to record vCard scan event",
        code: "INTERNAL_ERROR",
        status: 200,
        details: error instanceof Error ? { message: error.message } : error,
      });
    });

    return new NextResponse(vcard, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.vcf"; filename*=UTF-8''${utf8Filename}.vcf`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    logger.error({
      area: "api",
      route: "/v/[code]",
      message: "Failed to build vCard file",
      code: "INTERNAL_ERROR",
      status: 302,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
  }
}
