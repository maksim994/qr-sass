import { getApiUser, unauthorized } from "@/lib/api-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { csvEscape, csvRow } from "@/lib/csv";
import { getEntitlements } from "@/lib/entitlements";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { analyticsWindow, isBotDevice, parseAnalyticsDays } from "@/lib/analytics-metrics";

const MAX_EXPORT_ROWS = 50_000;

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

    const entitlements = await getEntitlements(workspaceId);
    if (!entitlements.allowsAnalytics) {
      return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403, undefined, requestId);
    }

    const days = parseAnalyticsDays(searchParams.get("days"));
    const { start: since } = analyticsWindow(days);

    const db = getDb();
    const scans = await db.scanEvent.findMany({
      where: {
        qrCode: { workspaceId },
        scannedAt: { gte: since },
      },
      orderBy: { scannedAt: "desc" },
      take: MAX_EXPORT_ROWS + 1,
      include: {
        qrCode: { select: { name: true, contentType: true, shortCode: true, currentTargetUrl: true } },
      },
    });

    const truncated = scans.length > MAX_EXPORT_ROWS;
    const rows = truncated ? scans.slice(0, MAX_EXPORT_ROWS) : scans;

    const header = [
      "scanned_at",
      "qr_name",
      "content_type",
      "short_code",
      "device_type",
      "os",
      "is_bot",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "destination_url",
    ];

    const lines = [header.join(",")];
    if (truncated) {
      lines.push(csvEscape(`Экспорт обрезан: показаны первые ${MAX_EXPORT_ROWS} строк за период.`));
    }
    for (const scan of rows) {
      lines.push(
        csvRow([
          scan.scannedAt.toISOString(),
          scan.qrCode.name,
          scan.qrCode.contentType,
          scan.qrCode.shortCode,
          scan.deviceType,
          scan.os,
          isBotDevice(scan.deviceType) ? "1" : "0",
          scan.utmSource,
          scan.utmMedium,
          scan.utmCampaign,
          scan.qrCode.currentTargetUrl,
        ]),
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
