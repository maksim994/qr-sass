import { prepareQrCreation, requestActor, updateModeratedQr } from "@/lib/abuse/moderation";
import { abuseErrorResponse } from "@/lib/abuse/http";
import type { QrCode } from "@prisma/client";
import { nanoid } from "nanoid";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { withQrApi, type QrApiActor } from "@/lib/qr-api-auth";
import { qrApiCreateSchema, qrApiUpdateSchema, qrApiListSchema, qrApiImageSchema, qrApiStatsSchema } from "@/lib/qr-api-input";
import { createQrWithinQuota, QrQuotaError } from "@/lib/qr-create-transaction";
import { canEditManagedQr } from "@/lib/qr-edit-policy";
import { getDisabledQrTypes, isQrTypeDisabled } from "@/lib/disabled-qr-types";
import { publicSiteUrl } from "@/lib/public-url";
import { defaultQrStyle } from "@/lib/qr-style-config";
import { evaluateScannability } from "@/lib/scannability";
import { renderStyledQrPng, renderStyledQrSvg } from "@/lib/qr-styled-render";

function invalid() { return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400); }
function notFound() { return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404); }
function dto(qr: QrCode) {
  // Deliberate allowlist: no payloads, password hashes, visitor data or internal tenant IDs.
  return { id: qr.id, name: qr.name, kind: qr.kind, contentType: qr.contentType, shortCode: qr.shortCode,
    moderationStatus: qr.moderationStatus, holdUntilCheck: qr.holdUntilCheck, targetUrl: qr.currentTargetUrl, source: qr.creationSource, createdAt: qr.createdAt, updatedAt: qr.updatedAt,
    shortUrl: qr.shortCode && qr.kind === "DYNAMIC" && qr.contentType === "URL" ? qr.encodedContent : null };
}
function ownedQr(actor: QrApiActor, id: string) {
  return getDb().qrCode.findFirst({ where: { id, workspaceId: actor.workspaceId, isArchived: false } });
}
export async function qrApiList(request: Request) {
  return withQrApi(request, "qr:read", async actor => {
    const parsed = qrApiListSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return invalid();
    const { limit, offset } = parsed.data;
    const rows = await getDb().qrCode.findMany({ where: { workspaceId: actor.workspaceId, isArchived: false },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: offset, take: limit + 1 });
    return apiSuccess({ items: rows.slice(0, limit).map(dto), limit, offset, nextOffset: rows.length > limit ? offset + limit : null });
  });
}
export async function qrApiCreate(request: Request) {
  return withQrApi(request, "qr:write", async actor => {
    const parsed = qrApiCreateSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return invalid();
    if (isQrTypeDisabled("URL", await getDisabledQrTypes())) return apiError(MSG.QR_TYPE_DISABLED, "FORBIDDEN", 403);
    const { name, targetUrl, source } = parsed.data;
    const shortCode = nanoid(8);
    const encodedContent = publicSiteUrl(`/r/${shortCode}`);
    try {
      const createQr = await prepareQrCreation({
        workspaceId: actor.workspaceId, createdById: actor.userId, kind: "DYNAMIC", contentType: "URL",
        name, currentTargetUrl: targetUrl, payload: { url: targetUrl }, shortCode, encodedContent,
        styleConfig: { ...defaultQrStyle, quietZoneModules: 4, errorCorrectionLevel: "H" }, creationSource: source,
        revisions: { create: { changedById: actor.userId, destinationUrl: targetUrl, encodedContent: targetUrl } },
      }, requestActor(request, actor, "create"));
      const qr = await createQrWithinQuota({ workspaceId: actor.workspaceId, planId: actor.entitlements.planId,
        plan: actor.entitlements.plan, needsDynamic: true }, createQr);
      return apiSuccess(dto(qr), 201);
    } catch (error) {
    const abuseResponse = abuseErrorResponse(error); if (abuseResponse) return abuseResponse;
      if (error instanceof QrQuotaError) return apiError(error.message, "FORBIDDEN", 403, { code: error.quota.code });
      throw error;
    }
  });
}
export async function qrApiGet(request: Request, id: string) {
  return withQrApi(request, "qr:read", async actor => {
    const qr = await ownedQr(actor, id);
    return qr ? apiSuccess(dto(qr)) : notFound();
  });
}
export async function qrApiUpdate(request: Request, id: string) {
  return withQrApi(request, "qr:write", async actor => {
    const parsed = qrApiUpdateSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return invalid();
    const qr = await ownedQr(actor, id);
    if (!qr) return notFound();
    if (qr.kind !== "DYNAMIC" || qr.contentType !== "URL") return invalid();
    if (!await canEditManagedQr(qr)) return apiError(MSG.PLAN_QR_EDIT_LIMIT, "FORBIDDEN", 403);
    const updated = await updateModeratedQr(qr.id, {
      currentTargetUrl: parsed.data.targetUrl,
      payload: { ...(qr.payload as Record<string, unknown> ?? {}), url: parsed.data.targetUrl },
      revisions: { create: { changedById: actor.userId, destinationUrl: parsed.data.targetUrl, encodedContent: qr.encodedContent } },
    }, requestActor(request, actor), { workspaceId: actor.workspaceId, requireActive: true });
    return apiSuccess(dto(updated));
  });
}
export async function qrApiImage(request: Request, id: string) {
  return withQrApi(request, "qr:read", async actor => {
    const parsed = qrApiImageSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return invalid();
    const qr = await ownedQr(actor, id);
    if (!qr) return notFound();
    const { format, size, foreground, background, errorCorrectionLevel } = parsed.data;
    if (!actor.entitlements.plan.limits.exportFormats.includes(format === "png" ? "PNG" : "SVG")) return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
    // Export a safe, plain style; stored logos never trigger external fetches through this API.
    const style = { ...defaultQrStyle, dotColor: foreground, cornerSquareColor: foreground,
      cornerDotColor: foreground, bgColor: background, errorCorrectionLevel, quietZoneModules: 4 };
    if (!evaluateScannability(style).safeToUse) return apiError(MSG.SCANNABILITY_TOO_LOW, "VALIDATION_ERROR", 400);
    const content = format === "svg" ? await renderStyledQrSvg(qr.encodedContent, style, size)
      : new Uint8Array(await renderStyledQrPng(qr.encodedContent, style, size));
    return new Response(content, { headers: { "Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
      "Content-Disposition": `attachment; filename="qr.${format}"` } });
  });
}
export async function qrApiStats(request: Request, id: string) {
  return withQrApi(request, "stats:read", async actor => {
    const parsed = qrApiStatsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return invalid();
    const qr = await ownedQr(actor, id);
    if (!qr) return notFound();
    if (!actor.entitlements.allowsAnalytics) return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const end = new Date(Date.parse(`${parsed.data.to}T00:00:00.000Z`) + 86400000);
    const db = getDb();
    const [days, devices] = await Promise.all([
      db.$queryRaw<Array<{ date: string; count: number }>>`SELECT to_char("scannedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM "ScanEvent" WHERE "qrCodeId" = ${qr.id} AND "scannedAt" >= ${from} AND "scannedAt" < ${end} GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<Array<{ device: string; count: number }>>`SELECT CASE WHEN "deviceType" IN ('mobile', 'desktop', 'tablet') THEN "deviceType" ELSE 'unknown' END AS device, COUNT(*)::int AS count
        FROM "ScanEvent" WHERE "qrCodeId" = ${qr.id} AND "scannedAt" >= ${from} AND "scannedAt" < ${end} GROUP BY 1 ORDER BY 1`,
    ]);
    const counts = new Map(days.map(day => [day.date, day.count]));
    const byDay = [];
    for (let time = +from; time < +end; time += 86400000) {
      const date = new Date(time).toISOString().slice(0, 10);
      byDay.push({ date, count: counts.get(date) ?? 0 });
    }
    return apiSuccess({ from: parsed.data.from, to: parsed.data.to, timezone: "UTC", total: days.reduce((sum, day) => sum + day.count, 0), byDay, byDevice: devices });
  });
}
export async function qrApiCheck(request: Request) {
  return withQrApi(request, undefined, async actor => apiSuccess({ workspaceId: actor.workspaceId, name: actor.key.name,
    scopes: actor.key.scopes, rateLimit: actor.key.rateLimit, plan: actor.entitlements.planId,
    limits: { maxDynamicQr: actor.entitlements.plan.limits.maxDynamicQr ?? null, maxQrCodes: actor.entitlements.plan.limits.maxQrCodes } }));
}
