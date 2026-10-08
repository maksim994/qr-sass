import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { getRequestId } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { publicSiteUrl } from "@/lib/public-url";

async function logout(request: Request) {
  const requestId = getRequestId(request);
  await clearAuthCookie();
  logger.info({
    area: "api",
    route: "/api/auth/logout",
    message: "User logged out",
    requestId,
    status: 200,
  });
  // Behind the proxy request.url can contain the container's 0.0.0.0:3000 origin.
  return NextResponse.redirect(publicSiteUrl("/"), 302);
}

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}
