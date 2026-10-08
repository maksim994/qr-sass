import { apiError } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import { logger } from "@/lib/logger";
import { processRobokassaResult } from "@/lib/robokassa-result";

export const runtime = "nodejs";

async function handle(request: Request) {
  try {
    let params: URLSearchParams;
    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
        return apiError(MSG.BILLING_NOTIFICATION_INVALID, "VALIDATION_ERROR", 400);
      }
      const reader = request.body?.getReader();
      if (!reader) return apiError(MSG.BILLING_NOTIFICATION_INVALID, "VALIDATION_ERROR", 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 16_384) {
          await reader.cancel();
          return apiError(MSG.BILLING_NOTIFICATION_INVALID, "VALIDATION_ERROR", 400);
        }
        chunks.push(value);
      }
      params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    } else {
      if (request.url.length > 16_384) return apiError(MSG.BILLING_NOTIFICATION_INVALID, "VALIDATION_ERROR", 400);
      params = new URL(request.url).searchParams;
    }
    const result = await processRobokassaResult(params);
    if (!result.ok) return apiError(MSG.BILLING_NOTIFICATION_INVALID, "BAD_REQUEST", result.status);
    return new Response(`OK${result.invoiceId}`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    // Do not log request bodies, passwords, signatures, or the buyer's email.
    logger.error({ area: "api", route: "/api/billing/webhook/robokassa", message: "Robokassa callback failed", code: "INTERNAL_ERROR", status: 500 });
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500);
  }
}

// Covered by the existing /api/billing/webhook CSRF exception. The signed
// ResultURL request is verified against a stored order before any mutation.
export const GET = handle;
export const POST = handle;
