import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan, formatUsage } from "@/lib/plans";
import { contentTypeLabels, getQrTypeInfo } from "@/lib/qr-types";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Alert } from "@/components/ui";

const FALLBACK_ICON =
  "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z";

function QrRowIcon({ contentType }: { contentType: string }) {
  const icon = getQrTypeInfo(contentType)?.icon ?? FALLBACK_ICON;
  return (
    <span className="qrs-dash-stat-icon" style={{ width: 44, height: 44, borderRadius: 10, background: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
    </span>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

  const [totalQr, recentQrs, scanCount7d, totalScans, dynamicCount, memberCount] = await Promise.all([
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    db.qrCode.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { scanEvents: true } } },
    }),
    db.scanEvent.count({
      where: {
        qrCode: { workspaceId: workspace.id },
        scannedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.scanEvent.count({
      where: { qrCode: { workspaceId: workspace.id } },
    }),
    db.qrCode.count({
      where: { workspaceId: workspace.id, kind: "DYNAMIC", isArchived: false },
    }),
    db.membership.count({
      where: { workspaceId: workspace.id },
    }),
  ]);

  const planInfo = await getPlan(workspace.plan ?? "FREE");
  const qrLimit = planInfo.limits.maxQrCodes;
  const userLimit = planInfo.limits.maxUsers;
  const qrRemaining = qrLimit == null ? null : Math.max(0, qrLimit - totalQr);

  const stats = [
    {
      label: "Всего QR-кодов",
      value: totalQr,
      icon: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z",
      tone: "primary" as const,
    },
    {
      label: "Сканирований за 7 дней",
      value: scanCount7d,
      icon: "M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6",
      tone: "accent" as const,
    },
    {
      label: "Динамических QR",
      value: dynamicCount,
      icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182",
      tone: "primary" as const,
    },
  ];

  return (
    <div>
      <DashboardPageHeader
        title="Обзор"
        description="Статистика и последние QR-коды вашего пространства."
        action={
          <Link href="/dashboard/create" className="fk-button fk-button--primary shrink-0">
            Создать QR-код
          </Link>
        }
      />

      <OnboardingChecklist
        hasQr={totalQr > 0}
        hasScan={totalScans > 0}
        hasDynamic={dynamicCount > 0}
        hasTeam={memberCount > 1}
      />

      <div className="qrs-dash-plan qrs-grid-3">
        <div>
          <div style={{ font: "var(--fw-bold) 1.3rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
            Текущий тариф: {planInfo.name}
          </div>
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "26px", font: "var(--fw-medium) 14px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            <span>
              QR-кодов: <b className="tnum" style={{ color: "var(--text-strong)" }}>{formatUsage(totalQr, qrLimit)}</b>
              {qrRemaining !== null && qrRemaining <= 3 && qrRemaining > 0 && (
                <span className="qrs-dash-limit-warning">· осталось {qrRemaining}</span>
              )}
              {qrLimit !== null && totalQr >= qrLimit && <span className="qrs-dash-limit-warning">· лимит достигнут</span>}
            </span>
            <span>
              Пользователей: <b className="tnum" style={{ color: "var(--text-strong)" }}>{formatUsage(memberCount, userLimit)}</b>
              {userLimit !== null && memberCount >= userLimit && <span className="qrs-dash-limit-warning">· лимит достигнут</span>}
            </span>
          </div>
          {planInfo.id === "FREE" && (
            <Link href="/dashboard/billing" className="mt-4 inline-block qrs-navlink">
              Перейти на Про — динамика и аналитика →
            </Link>
          )}
        </div>
        <ul className="qrs-dash-plan-features">
          {planInfo.limitLabels.map((label) => (
            <li key={label} style={{ display: "flex", alignItems: "center", gap: "8px", font: "var(--fw-semibold) 13px/1.3 var(--font-sans)", color: "var(--text-default)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="qrs-dash-stat-grid qrs-grid-3">
        {stats.map((stat) => (
          <div key={stat.label} className="qrs-dash-stat-card qrs-card-lift">
            <span
              className="qrs-dash-stat-icon"
              style={{
                background: stat.tone === "accent" ? "var(--color-accent-subtle)" : "var(--color-primary-subtle)",
                color: stat.tone === "accent" ? "var(--color-accent)" : "var(--color-primary)",
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={stat.icon} />
              </svg>
            </span>
            <div>
              <div className="tnum" style={{ font: "var(--fw-extra) 1.9rem/1 var(--font-display)", color: "var(--text-strong)" }}>
                {stat.value}
              </div>
              <div style={{ marginTop: "5px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ font: "var(--fw-bold) 1.25rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
          Последние QR-коды
        </h2>
        {recentQrs.length > 0 && (
          <Link href="/dashboard/library" className="qrs-navlink">
            Смотреть все
          </Link>
        )}
      </div>

      {recentQrs.length === 0 ? (
        <Alert variant="info" title="Пока нет QR-кодов" className="mt-4">
          <Link href="/dashboard/create" className="qrs-navlink">
            Добавьте свой первый QR-код
          </Link>
        </Alert>
      ) : (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {recentQrs.map((qr) => {
            const tracksScans = qr.kind === "DYNAMIC" || qr.contentType === "VCARD";
            return (
              <Link
                key={qr.id}
                href={`/dashboard/qr/${qr.id}`}
                className="qrs-row-lift"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <QrRowIcon contentType={qr.contentType} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>{qr.name}</div>
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="qrs-dash-qr-pill">{contentTypeLabels[qr.contentType] || qr.contentType}</span>
                    <span style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                      {qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  {tracksScans ? (
                    <>
                      <div className="tnum" style={{ font: "var(--fw-extra) 1.3rem/1 var(--font-display)", color: "var(--text-strong)" }}>
                        {qr._count.scanEvents}
                      </div>
                      <div style={{ font: "var(--fw-medium) 11px/1 var(--font-sans)", color: "var(--text-muted)", marginTop: "3px" }}>
                        {qr.contentType === "VCARD" ? "скач." : "скан."}
                      </div>
                    </>
                  ) : (
                    <div style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                      {qr.createdAt.toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
