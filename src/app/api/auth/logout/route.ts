import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { getRequestId } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  await clearAuthCookie();
  logger.info({
    area: "api",
    route: "/api/auth/logout",
    message: "User logged out",
    requestId,
    status: 200,
  });
  // Redirect to home when called from form (browser navigation)
  return NextResponse.redirect(new URL("/", request.url), 302);
}
