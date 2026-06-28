import { NextResponse } from "next/server";
import { MSG } from "@/lib/user-messages";
import type { NextRequest } from "next/server";

const CSRF_SKIP_PREFIXES = [
  "/api/billing/webhook",
  "/api/qr/verify-password",
  "/api/gdpr/consent",
];

function csrfBlockedResponse() {
  return new NextResponse(JSON.stringify({ error: MSG.INVALID_CSRF }), {
    status: 403,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (CSRF_SKIP_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
      return response;
    }

    const method = request.method;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfCookie = request.cookies.get("csrf_token")?.value;
      const csrfHeader = request.headers.get("x-csrf-token");

      // For API requests, we require the CSRF token to match
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        // Only block if it's a browser request (has Origin or Referer)
        // This allows programmatic API access with API keys to bypass CSRF
        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        const isBrowserRequest = origin || referer;

        if (isBrowserRequest) {
          return csrfBlockedResponse();
        }
      }
    }
  }

  // Generate and set CSRF token if not present
  if (!request.cookies.has("csrf_token")) {
    const token = crypto.randomUUID();
    response.cookies.set("csrf_token", token, {
      path: "/",
      httpOnly: false, // Must be readable by JS to send in header
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
