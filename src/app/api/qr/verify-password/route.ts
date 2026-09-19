import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";
import {
  QR_ACCESS_MAX_AGE_SEC,
  createQrAccessToken,
  qrAccessCookieName,
} from "@/lib/qr-access-token";
import { consumeRateLimit, getClientIp, qrPasswordRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { qrPublicPath } from "@/lib/safe-redirect";
import { qrUnavailablePath } from "@/lib/qr-lifetime-policy";

function redirect303(url: URL) {
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr/verify-password";
  const baseUrl = env.APP_URL;

  try {
    let code = "";
    let password = "";
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await readJsonBody<Record<string, unknown>>(request);
      if (raw && typeof raw === "object") {
        code = typeof raw.code === "string" ? raw.code.trim() : "";
        password = typeof raw.password === "string" ? raw.password : "";
      }
    } else {
      const fd = await request.formData();
      code = String(fd.get("code") ?? "").trim();
      password = String(fd.get("password") ?? "");
    }

    if (!code || !password) {
      const errUrl = new URL("/", baseUrl);
      return redirect303(errUrl);
    }

    const ip = getClientIp(request);
    const limited = await consumeRateLimit(qrPasswordRateLimiter, `${ip}:${code}`);
    if (!limited.success) {
      const errUrl = new URL(`/r/${code}`, baseUrl);
      errUrl.searchParams.set("error", "rate_limited");
      return redirect303(errUrl);
    }

    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: { shortCode: code },
      select: { id: true, passwordHash: true, contentType: true, kind: true, shortCode: true, isArchived: true },
    });

    if (!qr || !qr.shortCode) {
      return redirect303(new URL(qrUnavailablePath("missing"), baseUrl));
    }
    if (qr.isArchived) {
      return redirect303(new URL(qrUnavailablePath("archived"), baseUrl));
    }

    const destPath = qrPublicPath({ shortCode: qr.shortCode, contentType: qr.contentType });
    const destUrl = new URL(destPath, baseUrl);

    if (!qr.passwordHash) {
      return redirect303(destUrl);
    }

    const valid = await bcrypt.compare(password, qr.passwordHash);
    if (!valid) {
      destUrl.searchParams.set("error", "invalid_password");
      return redirect303(destUrl);
    }

    const token = await createQrAccessToken(qr.id, qr.passwordHash);
    const cookieStore = await cookies();
    cookieStore.set(qrAccessCookieName(qr.shortCode), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: QR_ACCESS_MAX_AGE_SEC,
      path: "/",
    });

    return redirect303(destUrl);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
    } else {
      logger.error({
        area: "api",
        route,
        requestId,
        message: "Verify password failed",
        code: "INTERNAL_ERROR",
        status: 500,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
    return redirect303(new URL("/", baseUrl));
  }
}
