import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const COOKIE_NAME = "gdpr_consent";

export async function POST(request: Request) {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const fd = await request.formData();
    const redirectTo = fd.get("redirectTo");
    const path = typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/";

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.redirect(new URL(path, baseUrl));
  } catch {
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
