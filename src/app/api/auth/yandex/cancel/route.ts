import { NextResponse } from "next/server";
import { clearYandexPendingCookie } from "@/lib/legal-consent";

export async function GET(request: Request) {
  await clearYandexPendingCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
