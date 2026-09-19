import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { workspaceActivation } from "@/lib/funnel";
import { analyticsWindow, humanDevicePrismaWhere } from "@/lib/analytics-metrics";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");
  const db = getDb();
  const active = { workspaceId: workspace.id, isArchived: false };
  const { start } = analyticsWindow(7);
  const [entitlements, activation, totalQr, recentQrs, dynamicCount, trackedCount, memberCount] = await Promise.all([
    getEntitlements(workspace.id),
    workspaceActivation(workspace.id),
    db.qrCode.count({ where: active }),
    db.qrCode.findMany({ where: active, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { scanEvents: true } } } }),
    db.qrCode.count({ where: { ...active, kind: "DYNAMIC" } }),
    db.qrCode.count({ where: { ...active, OR: [{ kind: "DYNAMIC" }, { contentType: "VCARD" }] } }),
    db.membership.count({ where: { workspaceId: workspace.id } }),
  ]);
  const scanCount7d = entitlements.allowsAnalytics && trackedCount > 0
    ? await db.scanEvent.count({ where: { qrCode: { ...active, OR: [{ kind: "DYNAMIC" }, { contentType: "VCARD" }] }, scannedAt: { gte: start }, ...humanDevicePrismaWhere() } })
    : null;

  return <DashboardOverview
    totalQr={totalQr}
    dynamicCount={dynamicCount}
    scanCount7d={scanCount7d}
    memberCount={memberCount}
    plan={entitlements.plan}
    status={entitlements.status}
    periodEnd={entitlements.periodEnd?.toISOString() ?? null}
    activation={{ ...activation, hasQr: activation.hasQr || totalQr > 0 }}
    canTrackOpens={entitlements.allowsAnalytics && trackedCount > 0}
    recentQrs={recentQrs.map((qr) => ({ id: qr.id, name: qr.name, kind: qr.kind, contentType: qr.contentType, createdAt: qr.createdAt.toISOString(), scanCount: qr._count.scanEvents }))}
  />;
}
