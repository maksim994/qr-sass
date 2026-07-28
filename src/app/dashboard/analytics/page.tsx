import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ days?: string }>;
};

const PERIODS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
] as const;

function parseDays(raw: string | undefined) {
  const n = Number(raw || "7");
  return PERIODS.some((p) => p.days === n) ? n : 7;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

function formatWeekdayShort(date: Date) {
  return WEEKDAY_LABELS[date.getDay()];
}

function formatDayLabel(date: Date, chartDays: number) {
  if (chartDays <= 7) return formatWeekdayShort(date);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatDeviceLabel(value: string) {
  const map: Record<string, string> = {
    mobile: "Смартфоны",
    desktop: "Десктоп",
    bot: "Боты",
    tablet: "Планшеты",
  };
  return map[value.toLowerCase()] ?? value;
}

function aggregateCounts(values: (string | null | undefined)[], limit = 5) {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim() || "Неизвестно";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function formatGrowth(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const params = await searchParams;
  const days = parseDays(params.days);

  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
  const chartDays = Math.min(days, 30);
  const chartStart = startOfDay(new Date(now.getTime() - (chartDays - 1) * 24 * 60 * 60 * 1000));

  const [totalScans, totalQr, scansPeriod, scansPrevPeriod, periodScans, recentScans] = await Promise.all([
    db.scanEvent.count({ where: { qrCode: { workspaceId: workspace.id } } }),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    db.scanEvent.count({
      where: { qrCode: { workspaceId: workspace.id }, scannedAt: { gte: periodStart } },
    }),
    db.scanEvent.count({
      where: {
        qrCode: { workspaceId: workspace.id },
        scannedAt: { gte: prevPeriodStart, lt: periodStart },
      },
    }),
    db.scanEvent.findMany({
      where: { qrCode: { workspaceId: workspace.id }, scannedAt: { gte: periodStart } },
      select: { scannedAt: true, country: true, deviceType: true, userAgentRaw: true },
      orderBy: { scannedAt: "desc" },
      take: 5000,
    }),
    db.scanEvent.findMany({
      where: { qrCode: { workspaceId: workspace.id } },
      orderBy: { scannedAt: "desc" },
      take: 20,
      include: { qrCode: { select: { name: true, contentType: true } } },
    }),
  ]);

  const dailyCounts = Array.from({ length: chartDays }, (_, index) => {
    const day = new Date(chartStart.getTime() + index * 24 * 60 * 60 * 1000);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const count = periodScans.filter((scan) => scan.scannedAt >= day && scan.scannedAt < next).length;
    return { day, count };
  });
  const maxDaily = Math.max(...dailyCounts.map((d) => d.count), 1);

  const uniqueDevices = new Set(
    periodScans.map((s) => s.userAgentRaw?.trim() || s.deviceType?.trim() || "unknown"),
  ).size;
  const uniqueDevicePct = periodScans.length > 0 ? Math.round((uniqueDevices / periodScans.length) * 100) : 0;

  const countries = aggregateCounts(periodScans.map((s) => s.country));
  const devices = aggregateCounts(periodScans.map((s) => s.deviceType)).map((item) => ({
    ...item,
    label: formatDeviceLabel(item.label),
  }));
  const totalForBreakdown = periodScans.length || 1;
  const hasPeriodScans = periodScans.length > 0;
  const deviceRows = devices.length > 0 ? devices : [{ label: "Нет данных", count: 0 }];
  const countryRows = countries.length > 0 ? countries : [{ label: "Нет данных", count: 0 }];
  const growth = formatGrowth(scansPeriod, scansPrevPeriod);
  const growthPositive = !growth.startsWith("-") && growth !== "0%";

  const stats = [
    {
      label: "Всего сканирований",
      value: totalScans.toLocaleString("ru-RU"),
      hint: "за всё время",
      tone: "default" as const,
    },
    {
      label: `За ${days} дн.`,
      value: scansPeriod.toLocaleString("ru-RU"),
      hint: `рост к пред. периоду: ${growth}`,
      tone: growthPositive ? ("accent" as const) : ("default" as const),
    },
    {
      label: "Уникальных устройств",
      value: hasPeriodScans ? `${uniqueDevicePct}%` : "—",
      hint: hasPeriodScans ? `доля уникальных за ${days} дн.` : "нужны сканы за период",
      tone: "default" as const,
    },
  ];

  const exportHref = `/api/analytics/export?workspaceId=${encodeURIComponent(workspace.id)}&days=${days}`;

  return (
    <div className="qrs-analytics-page">
      <DashboardPageHeader
        title="Аналитика"
        description="Сканирования, устройства и география. Карточки периода независимы от общего итога."
        action={
          <a href={exportHref} className="fk-button fk-button--secondary shrink-0">
            Экспорт CSV
          </a>
        }
      />

      <div className="qrs-analytics-period" role="tablist" aria-label="Период">
        {PERIODS.map((period) => (
          <Link
            key={period.days}
            href={`/dashboard/analytics?days=${period.days}`}
            className={`qrs-lib-filter${days === period.days ? " active" : ""}`}
            role="tab"
            aria-selected={days === period.days}
          >
            {period.label}
          </Link>
        ))}
      </div>

      {totalQr === 0 ? (
        <Alert variant="info" title="Нет QR-кодов" className="qrs-analytics-alert">
          Создайте первый QR-код, чтобы начать собирать статистику сканирований.{" "}
          <Link href="/dashboard/create" className="qrs-navlink">
            Создать QR-код
          </Link>
        </Alert>
      ) : null}

      {totalQr > 0 && totalScans === 0 ? (
        <Alert variant="info" title="Сканирований пока нет" className="qrs-analytics-alert">
          Отсканируйте динамический QR телефоном или откройте короткую ссылку. Статические коды не пишут события в аналитику.{" "}
          <Link href="/dashboard/library" className="qrs-navlink">
            Открыть библиотеку
          </Link>
          {" · "}
          <Link href="/dashboard/create" className="qrs-navlink">
            Создать QR
          </Link>
        </Alert>
      ) : null}

      {totalScans > 0 && !hasPeriodScans ? (
        <Alert variant="info" title={`За ${days} дн. сканов нет`} className="qrs-analytics-alert">
          Всего в пространстве {totalScans.toLocaleString("ru-RU")} сканирований, но за выбранный период — 0. График и разбивки ниже относятся только к этому периоду.
        </Alert>
      ) : null}

      <div className="qrs-dash-stat-grid qrs-grid-3 qrs-analytics-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="qrs-dash-stat-card qrs-analytics-stat-card">
            <div
              className="tnum"
              style={{
                font: "var(--fw-extra) 1.9rem/1 var(--font-display)",
                color: stat.tone === "accent" ? "var(--color-accent)" : "var(--text-strong)",
              }}
            >
              {stat.value}
            </div>
            <div style={{ marginTop: "6px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
              {stat.label}
            </div>
            <div style={{ marginTop: "4px", font: "var(--fw-regular) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
              {stat.hint}
            </div>
          </div>
        ))}
      </div>

      <section className="qrs-wizard-card qrs-analytics-chart-card">
        <h2 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "22px" }}>
          Сканирования по дням ({chartDays} дн.)
        </h2>
        <div className="qrs-analytics-chart" role="img" aria-label={`График сканирований за ${chartDays} дней`}>
          {dailyCounts.map(({ day, count }) => {
            const barHeight = count > 0 ? Math.max(12, (count / maxDaily) * 160) : 3;
            return (
              <div key={day.toISOString()} className="qrs-analytics-chart-col">
                <span className="tnum qrs-analytics-chart-value">{count}</span>
                <div
                  className={`qrs-analytics-chart-bar${count === 0 ? " qrs-analytics-chart-bar--empty" : ""}`}
                  style={{ height: `${barHeight}px` }}
                />
                <span className="qrs-analytics-chart-label">{formatDayLabel(day, chartDays)}</span>
              </div>
            );
          })}
        </div>
        {!hasPeriodScans ? (
          <div className="qrs-analytics-empty">
            <p className="qrs-analytics-chart-caption">
              {totalScans > 0
                ? `За выбранный период сканирований нет — ниже в таблице могут быть более старые события.`
                : `За выбранный период сканирований пока нет.`}
            </p>
            <div className="qrs-analytics-empty-actions">
              <Link href="/dashboard/library" className="fk-button fk-button--secondary fk-button--sm">
                Скачать QR
              </Link>
              <Link href="/dashboard/create" className="fk-button fk-button--primary fk-button--sm">
                Создать динамический QR
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <div className="qrs-breakdown-grid qrs-analytics-breakdown">
        <section className="qrs-wizard-card">
          <h3 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "18px" }}>
            Устройства
          </h3>
          <div className="qrs-analytics-progress-list">
            {deviceRows.map((item) => {
              const pct = hasPeriodScans ? Math.round((item.count / totalForBreakdown) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="qrs-analytics-progress-head">
                    <span>{item.label}</span>
                    <span className="tnum">{pct}%</span>
                  </div>
                  <div className="qrs-analytics-progress-track">
                    <div className="qrs-analytics-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="qrs-wizard-card">
          <h3 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "18px" }}>
            География
          </h3>
          <ul className="qrs-analytics-geo-list">
            {countryRows.map((item) => (
              <li key={item.label} className="qrs-analytics-geo-row">
                <span>{item.label}</span>
                <span className="tnum">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section style={{ marginTop: "28px" }}>
        <h2 style={{ font: "var(--fw-bold) 1.25rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "16px" }}>
          Последние сканирования
        </h2>
        {recentScans.length === 0 ? (
          <div className="qrs-wizard-card" style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ font: "var(--fw-regular) 14px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
              Сканирований пока нет. Отсканируйте динамический код телефоном или скачайте его для размещения.
            </p>
            <div className="qrs-analytics-empty-actions" style={{ marginTop: 16, justifyContent: "center" }}>
              <Link href="/dashboard/library" className="fk-button fk-button--secondary fk-button--sm">
                Библиотека
              </Link>
              <Link href="/dashboard/create" className="fk-button fk-button--primary fk-button--sm">
                Создать QR
              </Link>
            </div>
          </div>
        ) : (
          <div className="qrs-data-card">
            <div className="qrs-scroll qrs-data-table-wrap">
              <table className="qrs-data-table">
                <thead>
                  <tr>
                    <th>QR-код</th>
                    <th>Дата</th>
                    <th>Страна</th>
                    <th>Устройство</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan) => (
                    <tr key={scan.id}>
                      <td>{scan.qrCode.name}</td>
                      <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>
                        {new Date(scan.scannedAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>{scan.country || "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>{scan.deviceType || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
