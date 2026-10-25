import { abuseErrorResponse } from "@/lib/abuse/rate";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { apiError } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import { hashQrApiKey, readQrBearer, type QrApiScope } from "@/lib/qr-api-input";
import { logger } from "@/lib/logger";

export function qrApiPrivate<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Authorization, Cookie");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export function qrApiUnauthorized() {
  const response = apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  response.headers.set("WWW-Authenticate", 'Bearer realm="QR-S QR API"');
  return response;
}
export async function authenticateQrApi(request: Request, scope?: QrApiScope) {
  const token = readQrBearer(request);
  if (!token) return { response: qrApiUnauthorized() };
  const db = getDb();
  const key = await db.qrApiKey.findUnique({ where: { keyHash: hashQrApiKey(token) } });
  if (!key || key.revokedAt) return { response: qrApiUnauthorized() };
  // A removed/demoted key creator cannot retain their previous administrator powers.
  const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: key.createdById, workspaceId: key.workspaceId } } });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) return { response: qrApiUnauthorized() };
  if (scope && !key.scopes.includes(scope)) return { response: apiError(MSG.QR_API_SCOPE, "FORBIDDEN", 403) };
  // A single atomic PostgreSQL counter is shared across replicas; Redis is not required.
  const window = new Date(Math.floor(Date.now() / 60000) * 60000);
  const rows = await db.$queryRaw<Array<{ requestCount: number }>>`
    UPDATE "QrApiKey" SET
      "requestCount" = CASE WHEN "windowStartedAt" = ${window} THEN "requestCount" + 1 ELSE 1 END,
      "windowStartedAt" = ${window}, "lastUsedAt" = NOW()
    WHERE "id" = ${key.id} AND "revokedAt" IS NULL
      AND ("windowStartedAt" IS DISTINCT FROM ${window} OR "requestCount" < "rateLimit")
    RETURNING "requestCount"`;
  if (!rows.length) {
    const active = await db.qrApiKey.findFirst({ where: { id: key.id, revokedAt: null } });
    if (!active) return { response: qrApiUnauthorized() };
    const response = apiError(MSG.QR_API_RATE, "RATE_LIMITED", 429);
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((+window + 60000 - Date.now()) / 1000))));
    response.headers.set("X-RateLimit-Limit", String(key.rateLimit));
    response.headers.set("X-RateLimit-Remaining", "0");
    return { response };
  }
  const entitlements = await getEntitlements(key.workspaceId);
  return { actor: { workspaceId: key.workspaceId, userId: key.createdById, key, entitlements, remaining: key.rateLimit - rows[0].requestCount } };
}
export type QrApiActor = NonNullable<Awaited<ReturnType<typeof authenticateQrApi>>["actor"]>;
export async function withQrApi(request: Request, scope: QrApiScope | undefined, action: (actor: QrApiActor) => Promise<Response>) {
  try {
    const auth = await authenticateQrApi(request, scope);
    if (auth.response) return qrApiPrivate(auth.response);
    const response = await action(auth.actor);
    response.headers.set("X-RateLimit-Limit", String(auth.actor.key.rateLimit));
    response.headers.set("X-RateLimit-Remaining", String(auth.actor.remaining));
    return qrApiPrivate(response);
  } catch (error) {
    const abuseResponse = abuseErrorResponse(error); if (abuseResponse) return qrApiPrivate(abuseResponse);
    // Never log request headers, credential material, or customer payloads.
    logger.error({ area: "api", message: "QR API request failed", code: "INTERNAL_ERROR", status: 500 });
    return qrApiPrivate(apiError(MSG.QR_API_FAILED, "INTERNAL_ERROR", 500));
  }
}
