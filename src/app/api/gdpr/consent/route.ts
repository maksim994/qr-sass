import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { safeInternalPath } from "@/lib/safe-redirect";
import { getDb } from "@/lib/db";
import { qrConsentCookieName, requiredConsentVersion } from "@/lib/qr-consent";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const baseUrl = env.APP_URL;
  try {
    const fd = await request.formData();
    const redirectTo = fd.get("redirectTo");
    const slugRaw = fd.get("slug");
    const path = safeInternalPath(typeof redirectTo === "string" ? redirectTo : "", "/");
    const slug = typeof slugRaw === "string" ? slugRaw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) : "";

    let version = 1;
    if (slug) {
      const db = getDb();
      const qr = await db.qrCode.findFirst({
        where: { shortCode: slug, kind: "DYNAMIC" },
        select: { payload: true },
      });
      const payload = (qr?.payload as Record<string, unknown> | undefined) ?? {};
      version = requiredConsentVersion(payload) || 1;
    }

    const cookieStore = await cookies();
    if (slug) {
      cookieStore.set(qrConsentCookieName(slug), String(version), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
    }

    return redirect303(new URL(path, baseUrl));
  } catch {
    return redirect303(new URL("/", baseUrl));
  }
}
