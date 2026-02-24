import { nanoid } from "nanoid";
import archiver from "archiver";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPlan } from "@/lib/plans";
import { defaultStyle, renderQrPng } from "@/lib/qr";
import { isSafeUrl } from "@/lib/url";

const BULK_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 1000,
  BUSINESS: 5000,
};

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/qr/bulk";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string | null;
    const projectId = (formData.get("projectId") as string) || undefined;

    if (!file || !workspaceId) {
      return apiError("file and workspaceId are required.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const membership = user.memberships.find((m) => m.workspaceId === workspaceId);
    if (!membership) return unauthorized();

    const db = getDb();
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    const plan = await getPlan(workspace?.plan);
    const bulkLimit = BULK_LIMITS[plan.id] ?? 50;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name || "").toLowerCase().slice(-4);
    let rows: Record<string, string>[] = [];

    if (ext === ".csv" || file.type === "text/csv") {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      rows = parsed.data?.filter((r) => Object.keys(r).length > 0) ?? [];
    } else if (ext === "xlsx" || ext === ".xls" || file.type?.includes("spreadsheet")) {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      if (!firstSheet) {
        return apiError("Empty spreadsheet.", "VALIDATION_ERROR", 400, undefined, requestId);
      }
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
    } else {
      return apiError("Unsupported format. Use CSV or Excel.", "BAD_REQUEST", 400, undefined, requestId);
    }

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
      return apiError("No valid rows with url column.", "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if (items.length > bulkLimit) {
      return apiError(
        `Maximum ${bulkLimit} items per request on ${plan.id} plan. You have ${items.length}.`,
        "FORBIDDEN",
        403,
        undefined,
        requestId
      );
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
    return apiError("Could not create bulk QR codes.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
