import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import { renderStyledQrSvg } from "@/lib/qr-styled-render";
import { selectWorkspace } from "@/lib/workspace-select";
import { QR_DETAIL_CHART_DAYS, analyticsWindow, fillDailySeries, formatDeviceLabel, humanDevicePrismaWhere, MSK_SCAN_DAY_SQL } from "@/lib/analytics-metrics";
import { nanoid } from "nanoid";
import { QrDetail } from "@/components/dashboard/qr-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QrDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

  const [qrRow, scanCountA, scanCountB] = await Promise.all([
    db.qrCode.findUnique({
      where: { id },
      include: {
        workspace: true,
        revisions: { orderBy: { createdAt: "desc" }, take: 10 },
        scanEvents: { orderBy: { scannedAt: "desc" }, take: 50 },
        _count: { select: { scanEvents: true } },
      },
    }),
    db.scanEvent.count({ where: { qrCodeId: id, abVariant: "A" } }),
    db.scanEvent.count({ where: { qrCodeId: id, abVariant: "B" } }),
  ]);

  if (!qrRow || qrRow.workspaceId !== workspace.id) {
    notFound();
  }

  let qr = qrRow;
  if (qr.contentType === "VCARD" && !qr.shortCode) {
    const shortCode = nanoid(8);
    const encodedContent = `${process.env.APP_URL ?? "http://localhost:3000"}/v/${shortCode}`;
    qr = await db.qrCode.update({
      where: { id: qr.id },
      data: { shortCode, encodedContent },
      include: {
        workspace: true,
        revisions: { orderBy: { createdAt: "desc" }, take: 10 },
        scanEvents: { orderBy: { scannedAt: "desc" }, take: 50 },
        _count: { select: { scanEvents: true } },
      },
    });
  }

  const weekWindow = analyticsWindow(7);
  const monthWindow = analyticsWindow(QR_DETAIL_CHART_DAYS);

  const [scans7d, scans30d, deviceGroups, osGroups, dailyRows, humanTotal] = await Promise.all([
    db.scanEvent.count({ where: { qrCodeId: id, scannedAt: { gte: weekWindow.start }, ...humanDevicePrismaWhere() } }),
    db.scanEvent.count({ where: { qrCodeId: id, scannedAt: { gte: monthWindow.start }, ...humanDevicePrismaWhere() } }),
    db.scanEvent.groupBy({
      by: ["deviceType"],
      where: { qrCodeId: id, scannedAt: { gte: monthWindow.start }, ...humanDevicePrismaWhere() },
      _count: { _all: true },
    }),
    db.scanEvent.groupBy({
      by: ["os"],
      where: { qrCodeId: id, scannedAt: { gte: monthWindow.start }, ...humanDevicePrismaWhere() },
      _count: { _all: true },
    }),
    db.$queryRaw<Array<{ day: Date; count: number | bigint }>>(Prisma.sql`
      SELECT ${Prisma.raw(MSK_SCAN_DAY_SQL)} AS day,
             COUNT(*) FILTER (WHERE COALESCE(se."deviceType", '') <> 'bot')::int AS count
      FROM "ScanEvent" se
      WHERE se."qrCodeId" = ${id}
        AND se."scannedAt" >= ${monthWindow.start}
      GROUP BY 1
      ORDER BY 1
    `),
    db.scanEvent.count({ where: { qrCodeId: id, ...humanDevicePrismaWhere() } }),
  ]);

  const dailyCounts = fillDailySeries(monthWindow.keys, dailyRows);
  const devices = deviceGroups
    .map((row) => ({ label: formatDeviceLabel(row.deviceType), count: row._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const osList = osGroups
    .map((row) => ({ label: row.os?.trim() || "Неизвестно", count: row._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const styleRaw = (qr.styleConfig as Record<string, unknown> | null) ?? {};
  const svgString = await renderStyledQrSvg(qr.encodedContent, styleRaw, 220);
  const entitlements = await getEntitlements(workspace.id);
  const plan = entitlements.plan;
  const exportFormats = plan.limits.exportFormats;
  return <QrDetail now={Date.now()} qr={qr} svgString={svgString} exportFormats={exportFormats} scans7d={scans7d} scans30d={scans30d} humanTotal={humanTotal} devices={devices} osList={osList} dailyCounts={dailyCounts} scanCountA={scanCountA} scanCountB={scanCountB}/>;
}
