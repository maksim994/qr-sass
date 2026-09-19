import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { selectWorkspace } from "@/lib/workspace-select";
import { AnalyticsDashboard, AnalyticsLocked } from "@/components/dashboard/analytics-dashboard";
import {
  analyticsWindow,
  fillDailySeries,
  formatDeviceLabel,
  parseAnalyticsDays,
  humanDevicePrismaWhere,
  MSK_SCAN_DAY_SQL,
} from "@/lib/analytics-metrics";

type PageProps = {
  searchParams: Promise<{ days?: string }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const entitlements = await getEntitlements(workspace.id);
  if (!entitlements.allowsAnalytics) return <AnalyticsLocked />;

  const params = await searchParams;
  const days = parseAnalyticsDays(params.days);
  const { start: periodStart, prevStart, keys: dayKeys } = analyticsWindow(days);

  const db = getDb();
  const workspaceFilter = { qrCode: { workspaceId: workspace.id } };
  const humanWhere = { ...workspaceFilter, scannedAt: { gte: periodStart }, ...humanDevicePrismaWhere() };
  const prevHumanWhere = {
    ...workspaceFilter,
    scannedAt: { gte: prevStart, lt: periodStart },
    ...humanDevicePrismaWhere(),
  };

  const [totalScans, trackedQr, humanPeriod, humanPrevPeriod, botPeriod, deviceGroups, osGroups, dailyRows, recentScans] =
    await Promise.all([
      db.scanEvent.count({ where: workspaceFilter }),
      db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false, OR: [{ kind: "DYNAMIC" }, { contentType: "VCARD" }] } }),
      db.scanEvent.count({ where: humanWhere }),
      db.scanEvent.count({ where: prevHumanWhere }),
      db.scanEvent.count({
        where: { ...workspaceFilter, scannedAt: { gte: periodStart }, deviceType: "bot" },
      }),
      db.scanEvent.groupBy({
        by: ["deviceType"],
        where: { ...workspaceFilter, scannedAt: { gte: periodStart }, ...humanDevicePrismaWhere() },
        _count: { _all: true },
      }),
      db.scanEvent.groupBy({
        by: ["os"],
        where: { ...workspaceFilter, scannedAt: { gte: periodStart }, ...humanDevicePrismaWhere() },
        _count: { _all: true },
      }),
      db.$queryRaw<Array<{ day: Date; count: number | bigint }>>(Prisma.sql`
        SELECT ${Prisma.raw(MSK_SCAN_DAY_SQL)} AS day,
               COUNT(*) FILTER (WHERE COALESCE(se."deviceType", '') <> 'bot')::int AS count
        FROM "ScanEvent" se
        INNER JOIN "QrCode" q ON q.id = se."qrCodeId"
        WHERE q."workspaceId" = ${workspace.id}
          AND se."scannedAt" >= ${periodStart}
        GROUP BY 1
        ORDER BY 1
      `),
      db.scanEvent.findMany({
        where: { ...workspaceFilter, scannedAt: { gte: periodStart } },
        orderBy: { scannedAt: "desc" },
        take: 20,
        include: { qrCode: { select: { name: true, contentType: true } } },
      }),
    ]);

  const dailyCounts = fillDailySeries(dayKeys, dailyRows);

  const devices = deviceGroups
    .map((row) => ({
      label: formatDeviceLabel(row.deviceType?.trim() || "Неизвестно"),
      count: row._count?._all ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
  const osRows = osGroups
    .map((row) => ({
      label: row.os?.trim() || "Неизвестно",
      count: row._count?._all ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const exportHref = `/api/analytics/export?workspaceId=${encodeURIComponent(workspace.id)}&days=${days}`;
  return <AnalyticsDashboard
    days={days} exportHref={exportHref} totalScans={totalScans} trackedQr={trackedQr}
    humanPeriod={humanPeriod} humanPrevPeriod={humanPrevPeriod} botPeriod={botPeriod}
    dailyCounts={dailyCounts} devices={devices} operatingSystems={osRows}
    recentScans={recentScans.map(scan => ({id: scan.id, qrId: scan.qrCodeId, name: scan.qrCode.name, scannedAt: scan.scannedAt.toISOString(), deviceType: scan.deviceType, os: scan.os}))}
  />;
}
