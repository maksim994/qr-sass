import { nanoid } from "nanoid";
import { MSG } from "@/lib/user-messages";
import archiver from "archiver";
import Papa from "papaparse";
import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getBulkBatchLimit, assertCanCreateQrCodes } from "@/lib/plans";
import { getEntitlements } from "@/lib/entitlements";
import { defaultStyle, renderQrPng } from "@/lib/qr";
import { isSafeUrl } from "@/lib/url";
import { projectBelongsToWorkspace } from "@/lib/tenant";
import { FUNNEL_EVENTS, recordFunnelEvent } from "@/lib/funnel";
import { BodyTooLargeError, MAX_BULK_BYTES, formDataWithinLimit } from "@/lib/request-body-limit";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr/bulk";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    let formData: FormData;
    try {
      formData = await formDataWithinLimit(request, MAX_BULK_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError || (error instanceof Error && "status" in error && (error as { status: number }).status === 413)) {
        return apiError("Файл слишком большой. Максимум 1 МБ.", "VALIDATION_ERROR", 413, undefined, requestId);
      }
      if (error instanceof Error && "status" in error && (error as { status: number }).status === 411) {
        return apiError(error.message, "VALIDATION_ERROR", 411, undefined, requestId);
      }
      throw error;
    }
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string | null;
    const projectId = (formData.get("projectId") as string) || undefined;

    if (!file || !workspaceId) {
      return apiError(MSG.FILE_AND_WORKSPACE_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);
    }
    if (file.size > MAX_BULK_BYTES) {
      return apiError("Файл слишком большой. Максимум 1 МБ.", "VALIDATION_ERROR", 413, undefined, requestId);
    }

    const membership = user.memberships.find((m) => m.workspaceId === workspaceId);
    if (!membership) return unauthorized();

    const db = getDb();
    if (!(await projectBelongsToWorkspace(db, projectId, workspaceId))) {
      return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403, undefined, requestId);
    }

    const entitlements = await getEntitlements(workspaceId);
    const plan = entitlements.plan;
    const bulkLimit = getBulkBatchLimit(plan.id);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BULK_BYTES) {
      return apiError("Файл слишком большой. Максимум 1 МБ.", "VALIDATION_ERROR", 413, undefined, requestId);
    }
    const ext = (file.name || "").toLowerCase();
    const isCsv = ext.endsWith(".csv") || file.type === "text/csv";
    if (!isCsv) {
      return apiError(MSG.UNSUPPORTED_BULK_FORMAT, "BAD_REQUEST", 400, undefined, requestId);
    }
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data?.filter((r) => Object.keys(r).length > 0) ?? [];

    const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, "_");
    const normalizedRows = rows.map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        if (v != null) out[normalizeKey(k)] = String(v).trim();
      }
      return out;
    });

    const items: Array<{
      url: string;
      name: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
    }> = [];

    for (let i = 0; i < normalizedRows.length; i++) {
      const r = normalizedRows[i];
      const url = r.url || r.url_link || r.link;
      if (!url || !isSafeUrl(url)) continue;
      const name = r.name || r.title || r.label || `QR ${i + 1}`;
      const targetUrl = new URL(url);
      if (r.utm_source) targetUrl.searchParams.set("utm_source", r.utm_source);
      if (r.utm_medium) targetUrl.searchParams.set("utm_medium", r.utm_medium || "qr");
      if (r.utm_campaign) targetUrl.searchParams.set("utm_campaign", r.utm_campaign);
      if (r.utm_term) targetUrl.searchParams.set("utm_term", r.utm_term);
      if (r.utm_content) targetUrl.searchParams.set("utm_content", r.utm_content);
      items.push({
        url: targetUrl.toString(),
        name: name.slice(0, 120),
        utm_source: r.utm_source,
        utm_medium: r.utm_medium,
        utm_campaign: r.utm_campaign,
        utm_term: r.utm_term,
        utm_content: r.utm_content,
      });
    }

    if (items.length === 0) {
      return apiError(MSG.NO_VALID_BULK_ROWS, "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if (items.length > bulkLimit) {
      return apiError(
        MSG.BULK_LIMIT(bulkLimit, plan.id, items.length),
        "FORBIDDEN",
        403,
        undefined,
        requestId
      );
    }

    const quota = await assertCanCreateQrCodes({
      workspaceId,
      planId: entitlements.planId,
      plan: entitlements.plan,
      count: items.length,
      needsDynamic: true,
    });
    if (!quota.ok) {
      return apiError(quota.message, "FORBIDDEN", 403, { code: quota.code }, requestId);
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const styleConfig = defaultStyle;

    const qrRecords: Array<{ id: string; shortCode: string; name: string; encodedContent: string }> = [];

    for (const item of items) {
      const shortCode = nanoid(8);
      const qrData = `${appUrl}/r/${shortCode}`;
      const qr = await db.qrCode.create({
        data: {
          workspaceId,
          projectId: projectId || null,
          createdById: user.id,
          kind: "DYNAMIC",
          contentType: "URL",
          name: item.name,
          shortCode,
          encodedContent: qrData,
          currentTargetUrl: item.url,
          payload: { url: item.url },
          styleConfig: styleConfig as object,
          revisions: {
            create: {
              changedById: user.id,
              destinationUrl: item.url,
              encodedContent: qrData,
            },
          },
        },
      });
      qrRecords.push({
        id: qr.id,
        shortCode: qr.shortCode!,
        name: qr.name,
        encodedContent: qr.encodedContent,
      });
      await recordFunnelEvent({
        name: FUNNEL_EVENTS.qr_created,
        workspaceId,
        userId: user.id,
        qrCodeId: qr.id,
        source: "bulk",
        oncePerQr: true,
      });
    }

    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const archiveDone = new Promise<void>((resolve, reject) => {
      archive.on("data", (chunk) => chunks.push(chunk as Buffer));
      archive.on("end", () => resolve());
      archive.on("error", reject);
    });

    for (const rec of qrRecords) {
      const png = await renderQrPng(rec.encodedContent, styleConfig);
      const safeName = (rec.name || rec.shortCode).replace(/[^\w.-]/g, "_").slice(0, 80);
      archive.append(png, { name: `${safeName}_${rec.shortCode}.png` });
    }

    await archive.finalize();
    await archiveDone;
    const zipBuffer = Buffer.concat(chunks);

    const utf8Filename = encodeURIComponent("qr-codes.zip");
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="qr-codes.zip"; filename*=UTF-8''${utf8Filename}`,
      },
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Bulk QR creation failed",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.COULD_NOT_CREATE_BULK, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
