import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr/verify-password";
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    let code = "";
    let password = "";
    let redirectTo = "";
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await readJsonBody<Record<string, unknown>>(request);
      if (raw && typeof raw === "object") {
        code = typeof raw.code === "string" ? raw.code.trim() : "";
        password = typeof raw.password === "string" ? raw.password : "";
        redirectTo = typeof raw.redirectTo === "string" && raw.redirectTo.startsWith("/") ? raw.redirectTo : "";
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const fd = await request.formData();
      code = String(fd.get("code") ?? "").trim();
      password = String(fd.get("password") ?? "");
      const rt = fd.get("redirectTo");
      redirectTo = typeof rt === "string" && rt.startsWith("/") ? rt : "";
    }

    if (!redirectTo) redirectTo = `/r/${code}`;
    if (!code || !password) {
      const errUrl = new URL(redirectTo, baseUrl);
      errUrl.searchParams.set("error", "invalid_request");
      return NextResponse.redirect(errUrl);
    }

    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: { shortCode: code, isArchived: false },
      select: { passwordHash: true },
    });

    if (!qr) {
      return NextResponse.redirect(new URL("/", baseUrl));
    }
    if (!qr.passwordHash) {
      return NextResponse.redirect(new URL(redirectTo, baseUrl));
    }

    const valid = await bcrypt.compare(password, qr.passwordHash);
    if (!valid) {
      const errUrl = new URL(redirectTo, baseUrl);
      errUrl.searchParams.set("error", "invalid_password");
      return NextResponse.redirect(errUrl);
    }

    const targetUrl = new URL(redirectTo, baseUrl);

    const cookieStore = await cookies();
    cookieStore.set(`qr_pwd_${code}`, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.redirect(targetUrl);
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
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
