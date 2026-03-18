import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Skip CSRF for webhooks and public endpoints if needed
    if (request.nextUrl.pathname.startsWith("/api/billing/webhook")) {
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
          return new NextResponse(JSON.stringify({ error: "Invalid CSRF token" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
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
