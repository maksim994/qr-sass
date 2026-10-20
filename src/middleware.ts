import { NextResponse } from "next/server";
import { MSG } from "@/lib/user-messages";
import type { NextRequest } from "next/server";
import { pathNeedsNoindexHeader } from "@/lib/seo-hygiene";
import { getDb } from "@/lib/db";
import { isEditorialRedirectPath, normalizeRedirectPath } from "@/lib/editorial-redirect-input";
import { publicOrigin } from "@/lib/public-url";

const CSRF_SKIP_PREFIXES = [
  "/api/billing/webhook",
  "/api/auth/logout",
  "/api/qr/verify-password",
  "/api/gdpr/consent",
  // Articles v1 accepts only explicit Bearer credentials, never session cookies.
  "/api/v1/articles",
  // Editorial REST endpoints accept Bearer only, never cookie sessions.
  "/api/v1/redirects",
  // Standalone image upload also accepts only explicit Bearer credentials.
  "/api/v1/images",
];

function csrfBlockedResponse() {
  return new NextResponse(JSON.stringify({ error: MSG.INVALID_CSRF }), {
    status: 403,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function middleware(request: NextRequest) {
  if (["GET", "HEAD"].includes(request.method) && request.nextUrl.pathname !== "/" && isEditorialRedirectPath(request.nextUrl.pathname)) {
    try {
      const source = normalizeRedirectPath(request.nextUrl.pathname);
      const rule = await getDb().blogRedirect.findUnique({ where: { source }, select: { target: true } });
      if (rule) {
        const target = new URL(rule.target, publicOrigin());
        if (!target.search) target.search = request.nextUrl.search;
        const redirect = NextResponse.redirect(target, 301);
        redirect.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        return redirect;
      }
    } catch { /* Keep existing routes available if the optional redirect lookup fails. */ }
  }
  const requestHeaders = new Headers(request.headers);
  const privateSurface = request.nextUrl.pathname.startsWith("/preview/") || request.nextUrl.pathname === "/admin/blog/tokens";
  // Trusted flag suppresses custom head and analytics on previews and one-time secret forms.
  requestHeaders.set("x-qrs-private-preview", privateSurface ? "1" : "0");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (pathNeedsNoindexHeader(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  if (privateSurface) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
  }

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
  runtime: "nodejs",
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
