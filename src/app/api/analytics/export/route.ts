import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const ALLOWED_DAYS = new Set([7, 30, 90]);

function csvEscape(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/analytics/export";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return apiError(MSG.WORKSPACE_ID_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === workspaceId);
    if (!isMember) return unauthorized();

    const daysRaw = Number(searchParams.get("days") || "7");
    const days = ALLOWED_DAYS.has(daysRaw) ? daysRaw : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const db = getDb();
    const scans = await db.scanEvent.findMany({
      where: {
        qrCode: { workspaceId },
        scannedAt: { gte: since },
      },
      orderBy: { scannedAt: "desc" },
      take: 5000,
      include: {
        qrCode: { select: { name: true, contentType: true, shortCode: true, currentTargetUrl: true } },
      },
    });

    const header = [
      "scanned_at",
      "qr_name",
      "content_type",
      "short_code",
      "country",
      "device_type",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "destination_url",
    ];

    const lines = [header.join(",")];
    for (const scan of scans) {
      lines.push(
        [
          csvEscape(scan.scannedAt.toISOString()),
          csvEscape(scan.qrCode.name),
          csvEscape(scan.qrCode.contentType),
          csvEscape(scan.qrCode.shortCode),
          csvEscape(scan.country),
          csvEscape(scan.deviceType),
          csvEscape(scan.utmSource),
          csvEscape(scan.utmMedium),
          csvEscape(scan.utmCampaign),
          csvEscape(scan.qrCode.currentTargetUrl),
        ].join(",")
      );
    }

    const body = `\uFEFF${lines.join("\n")}`;
    const filename = `qr-analytics-${days}d.csv`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
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
      message: "Unexpected analytics export error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
