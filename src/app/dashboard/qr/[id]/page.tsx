import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { contentTypeLabels } from "@/lib/qr-types";
import { getPlan } from "@/lib/plans";
import { renderStyledQrSvg } from "@/lib/qr-styled-render";
import { needsHostedPage } from "@/lib/qr";
import { selectWorkspace } from "@/lib/workspace-select";
import UpdateTarget from "@/components/update-target";
import TrackingPixelsForm from "@/components/tracking-pixels-form";
import AbTestForm from "@/components/ab-test-form";
import QrExpirySettings from "@/components/qr-expiry-settings";
import DeleteQrButton from "@/components/delete-qr-button";
import { Badge, Button } from "@/components/ui";
import { QrTypeIcon } from "@/components/qr-type-icon";
import { TrackedDownloadLink } from "@/components/dashboard/tracked-download-link";
import { nanoid } from "nanoid";

type Props = {
  params: Promise<{ id: string }>;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
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
        workspace: { select: { plan: true } },
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
        workspace: { select: { plan: true } },
        revisions: { orderBy: { createdAt: "desc" }, take: 10 },
        scanEvents: { orderBy: { scannedAt: "desc" }, take: 50 },
        _count: { select: { scanEvents: true } },
      },
    });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [scans7d, scans30d, analyticsScans] = await Promise.all([
    db.scanEvent.count({ where: { qrCodeId: id, scannedAt: { gte: weekAgo } } }),
    db.scanEvent.count({ where: { qrCodeId: id, scannedAt: { gte: monthAgo } } }),
    db.scanEvent.findMany({
      where: { qrCodeId: id, scannedAt: { gte: monthAgo } },
      select: { scannedAt: true, country: true, deviceType: true, os: true },
      orderBy: { scannedAt: "desc" },
      take: 1000,
    }),
  ]);

  const chartDays = 14;
  const chartStart = startOfDay(new Date(now.getTime() - (chartDays - 1) * 24 * 60 * 60 * 1000));
  const dailyCounts = Array.from({ length: chartDays }, (_, index) => {
    const day = new Date(chartStart.getTime() + index * 24 * 60 * 60 * 1000);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const count = analyticsScans.filter((scan) => scan.scannedAt >= day && scan.scannedAt < next).length;
    return { day, count };
  });
  const maxDaily = Math.max(...dailyCounts.map((d) => d.count), 1);

  const countries = aggregateCounts(analyticsScans.map((s) => s.country));
  const devices = aggregateCounts(analyticsScans.map((s) => s.deviceType));
  const osList = aggregateCounts(analyticsScans.map((s) => s.os));
  const totalForBreakdown = analyticsScans.length || 1;

  const styleRaw = (qr.styleConfig as Record<string, unknown> | null) ?? {};
  const svgString = await renderStyledQrSvg(qr.encodedContent, styleRaw, 220);
  const plan = await getPlan(qr.workspace?.plan);
  const exportFormats = plan.limits.exportFormats;
  const isVcard = qr.contentType === "VCARD";
  const tracksScans = qr.kind === "DYNAMIC" || isVcard;
  const hasShortLink = (qr.kind === "DYNAMIC" || isVcard) && !!qr.shortCode;
  const shortLinkPrefix = isVcard ? "v" : needsHostedPage(qr.contentType) ? "p" : "r";

  const stats = [
    {
      label: tracksScans ? (isVcard ? "Всего скачиваний" : "Всего сканирований") : "Сканирования",
      value: qr._count.scanEvents,
      icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9 7.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 019 18.375V7.125zM16.5 7.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V7.125z",
      tone: "primary" as const,
    },
    {
      label: "За 7 дней",
      value: scans7d,
      icon: "M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6",
      tone: "accent" as const,
    },
    {
      label: "За 30 дней",
      value: scans30d,
      icon: "M6.75 3v2.25M17.25 3v2.25M4.5 8.25h15M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6.75a1.5 1.5 0 00-1.5-1.5h-15a1.5 1.5 0 00-1.5 1.5v11.25a1.5 1.5 0 001.5 1.5z",
      tone: "primary" as const,
    },
  ];

  return (
    <>
      <div className="qrs-wizard-head" style={{ marginBottom: "24px" }}>
        <div className="qrs-wizard-head-start">
          <Link href="/dashboard/library" className="qrs-wizard-back" aria-label="Назад к библиотеке">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="qrs-wizard-title-row">
              <QrTypeIcon contentType={qr.contentType} variant="blue" />
              <h1 className="qrs-wizard-title">{qr.name}</h1>
              <Badge variant="primary">{contentTypeLabels[qr.contentType] || qr.contentType}</Badge>
              <Badge variant="info">{qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}</Badge>
            </div>
            <p className="qrs-wizard-subtitle">
              Создан {qr.createdAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Button href={`/dashboard/qr/${qr.id}/edit`} size="sm">
            Редактировать
          </Button>
          <DeleteQrButton qrId={qr.id} qrName={qr.name} />
        </div>
      </div>

      <div className="qrs-qr-detail-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="qrs-dash-stat-card">
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
              <div className="tnum" style={{ font: "var(--fw-extra) 1.7rem/1 var(--font-display)", color: "var(--text-strong)" }}>
                {stat.value}
              </div>
              <div style={{ marginTop: "5px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="qrs-build-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {tracksScans ? (
            <>
              <section className="qrs-wizard-card">
                <h2 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "16px" }}>
                  {isVcard ? "Динамика скачиваний" : "Динамика сканирований"}
                </h2>
                {analyticsScans.length === 0 ? (
                  <p style={{ font: "var(--fw-regular) 14px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
                    {isVcard ? "Скачиваний пока нет." : "Сканирований пока нет."}
                  </p>
                ) : (
                  <div className="qrs-qr-chart" aria-hidden="true">
                    {dailyCounts.map(({ day, count }) => (
                      <div key={day.toISOString()} className="qrs-qr-chart-bar-wrap">
                        <div className="qrs-qr-chart-bar" style={{ height: `${Math.max(8, (count / maxDaily) * 120)}px` }} />
                        <span className="qrs-qr-chart-label">{formatShortDate(day)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="qrs-breakdown-grid">
                <section className="qrs-wizard-card">
                  <h3 style={{ font: "var(--fw-bold) 1rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "14px" }}>Страны</h3>
                  <ul className="qrs-breakdown-list">
                    {countries.length === 0 ? (
                      <li style={{ color: "var(--text-muted)", font: "var(--fw-regular) 13px/1.4 var(--font-sans)" }}>Нет данных</li>
                    ) : (
                      countries.map((item) => (
                        <li key={item.label} className="qrs-breakdown-row">
                          <span>{item.label}</span>
                          <div className="qrs-breakdown-bar">
                            <div className="qrs-breakdown-bar-fill" style={{ width: `${(item.count / totalForBreakdown) * 100}%` }} />
                          </div>
                          <span className="tnum">{item.count}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
                <section className="qrs-wizard-card">
                  <h3 style={{ font: "var(--fw-bold) 1rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "14px" }}>Устройства</h3>
                  <ul className="qrs-breakdown-list">
                    {devices.length === 0 ? (
                      <li style={{ color: "var(--text-muted)", font: "var(--fw-regular) 13px/1.4 var(--font-sans)" }}>Нет данных</li>
                    ) : (
                      devices.map((item) => (
                        <li key={item.label} className="qrs-breakdown-row">
                          <span>{item.label}</span>
                          <div className="qrs-breakdown-bar">
                            <div className="qrs-breakdown-bar-fill" style={{ width: `${(item.count / totalForBreakdown) * 100}%` }} />
                          </div>
                          <span className="tnum">{item.count}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </div>

              <section className="qrs-wizard-card">
                <h3 style={{ font: "var(--fw-bold) 1rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "14px" }}>Операционные системы</h3>
                <ul className="qrs-breakdown-list">
                  {osList.length === 0 ? (
                    <li style={{ color: "var(--text-muted)", font: "var(--fw-regular) 13px/1.4 var(--font-sans)" }}>Нет данных</li>
                  ) : (
                    osList.map((item) => (
                      <li key={item.label} className="qrs-breakdown-row">
                        <span>{item.label}</span>
                        <div className="qrs-breakdown-bar">
                          <div className="qrs-breakdown-bar-fill" style={{ width: `${(item.count / totalForBreakdown) * 100}%` }} />
                        </div>
                        <span className="tnum">{item.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="qrs-wizard-card">
                <h2 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "16px" }}>
                  {isVcard ? "Последние скачивания" : "Последние сканирования"}
                </h2>
                {qr.scanEvents.length === 0 ? (
                  <p style={{ font: "var(--fw-regular) 14px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>Нет событий за выбранный период.</p>
                ) : (
                  <div className="qrs-apikeys-table-wrap">
                    <table className="qrs-apikeys-table">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Страна</th>
                          <th>Устройство</th>
                          <th>ОС</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qr.scanEvents.map((scan) => (
                          <tr key={scan.id}>
                            <td>
                              {scan.scannedAt.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}{" "}
                              <span style={{ color: "var(--text-muted)" }}>
                                {scan.scannedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td>{scan.country || "—"}</td>
                            <td>{scan.deviceType || "—"}</td>
                            <td>{scan.os || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="qrs-wizard-card">
              <p style={{ font: "var(--fw-regular) 14px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
                Статистика сканирований доступна только для динамических QR-кодов. При создании выберите тип «Динамический», чтобы отслеживать сканирования.
              </p>
              <Link href="/dashboard/create" className="qrs-navlink" style={{ display: "inline-block", marginTop: "16px" }}>
                Создать динамический QR-код →
              </Link>
            </section>
          )}
        </div>

        <aside className="qrs-preview" style={{ top: "96px" }}>
          <div className="qrs-preview-card">
            <div className="qrs-preview-head">
              <div className="qrs-preview-title">QR-код</div>
            </div>
            <div className="qrs-preview-frame" dangerouslySetInnerHTML={{ __html: svgString }} />

            <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {exportFormats.includes("PNG") && (
                <TrackedDownloadLink href={`/api/qr/${qr.id}/download?format=png`} className="fk-button fk-button--secondary fk-button--sm" download>
                  PNG
                </TrackedDownloadLink>
              )}
              {exportFormats.includes("SVG") && (
                <TrackedDownloadLink href={`/api/qr/${qr.id}/download?format=svg`} className="fk-button fk-button--secondary fk-button--sm" download>
                  SVG
                </TrackedDownloadLink>
              )}
              {exportFormats.includes("JPG") && (
                <TrackedDownloadLink href={`/api/qr/${qr.id}/download?format=jpg`} className="fk-button fk-button--secondary fk-button--sm" download>
                  JPG
                </TrackedDownloadLink>
              )}
              {exportFormats.includes("PDF") && (
                <TrackedDownloadLink href={`/api/qr/${qr.id}/download?format=pdf`} className="fk-button fk-button--secondary fk-button--sm" download>
                  PDF
                </TrackedDownloadLink>
              )}
            </div>

            {hasShortLink && qr.shortCode ? (
              <div style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)", background: "var(--surface-subtle)" }}>
                <p style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {isVcard ? "Ссылка на файл визитки" : needsHostedPage(qr.contentType) ? "Ссылка на страницу" : "Короткая ссылка"}
                </p>
                <a
                  href={`/${shortLinkPrefix}/${qr.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qrs-inline-code"
                  style={{ display: "inline-block", marginTop: "8px" }}
                >
                  /{shortLinkPrefix}/{qr.shortCode}
                </a>

                {!needsHostedPage(qr.contentType) && !isVcard ? (
                  <div style={{ marginTop: "16px" }}>
                    <p style={{ font: "var(--fw-semibold) 13px/1 var(--font-sans)", color: "var(--text-default)", marginBottom: "8px" }}>Текущий URL назначения</p>
                    <p style={{ font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {qr.currentTargetUrl || "Не задан"}
                    </p>
                    <UpdateTarget qrId={qr.id} currentUrl={qr.currentTargetUrl} />
                  </div>
                ) : null}

                {isVcard ? (
                  <a href={`/v/${qr.shortCode}`} className="fk-button fk-button--primary fk-button--sm" style={{ marginTop: "14px" }}>
                    Скачать текущий .vcf
                  </a>
                ) : null}

                {qr.contentType === "URL" && !needsHostedPage(qr.contentType) && !isVcard ? (
                  <>
                    <details className="qrs-adv" style={{ marginTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                      <summary style={{ display: "flex", alignItems: "center", gap: "8px", font: "var(--fw-bold) 13px/1 var(--font-sans)", color: "var(--text-strong)", cursor: "pointer" }}>
                        Ретаргетинг
                        <span className="qrs-chev" style={{ marginLeft: "auto" }} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                      </summary>
                      <div style={{ marginTop: "12px" }}>
                        <TrackingPixelsForm
                          qrId={qr.id}
                          trackingPixels={(qr.payload as Record<string, unknown>)?.trackingPixels as { metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string } ?? null}
                        />
                      </div>
                    </details>
                    <details className="qrs-adv" style={{ marginTop: "12px" }}>
                      <summary style={{ display: "flex", alignItems: "center", gap: "8px", font: "var(--fw-bold) 13px/1 var(--font-sans)", color: "var(--text-strong)", cursor: "pointer" }}>
                        A/B-тестирование
                        <span className="qrs-chev" style={{ marginLeft: "auto" }} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                      </summary>
                      <div style={{ marginTop: "12px" }}>
                        <AbTestForm
                          qrId={qr.id}
                          abTest={(qr.payload as Record<string, unknown>)?.abTest as { urlA?: string; urlB?: string } ?? null}
                          scanCountA={scanCountA}
                          scanCountB={scanCountB}
                        />
                      </div>
                    </details>
                  </>
                ) : null}

                {qr.kind === "DYNAMIC" ? (
                  <details className="qrs-adv" style={{ marginTop: "12px" }}>
                    <summary style={{ display: "flex", alignItems: "center", gap: "8px", font: "var(--fw-bold) 13px/1 var(--font-sans)", color: "var(--text-strong)", cursor: "pointer" }}>
                      Срок действия
                      <span className="qrs-chev" style={{ marginLeft: "auto" }} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                      </span>
                    </summary>
                    <div style={{ marginTop: "12px" }}>
                      <QrExpirySettings
                        qrId={qr.id}
                        expireAt={qr.expireAt}
                        maxScans={qr.maxScans}
                        passwordRequired={!!qr.passwordHash}
                        gdprRequired={((qr.payload as Record<string, unknown>)?.gdprRequired as boolean) ?? false}
                        gdprPolicyUrl={((qr.payload as Record<string, unknown>)?.gdprPolicyUrl as string) ?? null}
                        scanCount={qr._count.scanEvents}
                      />
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
