import Link from "next/link";
import { DashboardPageHeader } from "./dashboard-page-header";
import { AnalyticsChart } from "./analytics-chart";
import { ANALYTICS_PERIODS, ANALYTICS_TIMEZONE, formatDeviceLabel, formatGrowth, type AnalyticsDays } from "@/lib/analytics-metrics";
import styles from "./analytics-dashboard.module.css";

type Breakdown = { label: string; count: number };
export type AnalyticsDashboardProps = {
  days: AnalyticsDays;
  exportHref: string;
  totalScans: number;
  trackedQr: number;
  humanPeriod: number;
  humanPrevPeriod: number;
  botPeriod: number;
  dailyCounts: { key: string; count: number }[];
  devices: Breakdown[];
  operatingSystems: Breakdown[];
  recentScans: { id: string; qrId: string; name: string; scannedAt: string; deviceType: string | null; os: string | null }[];
};

function AnalyticsIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M4 20V10m8 10V4m8 16v-7M2 20h20" /></svg>;
}

export function AnalyticsLocked() {
  return <div className={styles.page}><DashboardPageHeader title="Аналитика" description="Узнайте, когда и с каких устройств открывают ваши QR-коды." />
    <section className={styles.empty}><AnalyticsIcon /><h2>Статистика открытий на тарифе Про</h2><p>Смотрите открытия по дням, сравнивайте периоды и скачивайте события в CSV. Аналитика доступна на тарифах Про и Бизнес.</p><Link href="/dashboard/billing" className="fk-button fk-button--primary">Посмотреть тарифы</Link><span>Уже напечатанные QR-коды продолжают открываться.</span></section>
  </div>;
}

function BreakdownPanel({ title, rows, total }: { title: string; rows: Breakdown[]; total: number }) {
  return <section className={styles.panel}><div className={styles.sectionHead}><h2>{title}</h2><span>Без известных ботов</span></div>
    {rows.length ? <ul className={styles.breakdown}>{rows.map((row, index) => {
      const percent = total > 0 ? Math.round(row.count / total * 100) : 0;
      return <li key={`${row.label}-${index}`}><div className={styles.breakdownHead}><span>{row.label}</span><span><strong>{row.count.toLocaleString("ru-RU")}</strong><span className={styles.percent}>{percent}%</span></span></div><div className={styles.track} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div></li>;
    })}</ul> : <p className={styles.quietEmpty}>Появятся после первых открытий без ботов.</p>}
  </section>;
}

export function AnalyticsDashboard({ days, exportHref, totalScans, trackedQr, humanPeriod, humanPrevPeriod, botPeriod, dailyCounts, devices, operatingSystems, recentScans }: AnalyticsDashboardProps) {
  const growth = formatGrowth(humanPeriod, humanPrevPeriod);
  const noHistory = totalScans === 0;
  const noPeriodEvents = humanPeriod + botPeriod === 0;
  const dateLabel = (key: string) => new Date(`${key}T12:00:00+03:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: ANALYTICS_TIMEZONE });
  return <div className={styles.page}>
    <DashboardPageHeader title="Аналитика" description="Открытия ваших QR-кодов, динамика по дням и устройства посетителей." action={<a href={exportHref} className="fk-button fk-button--secondary">Скачать CSV</a>} />
    <div className={styles.toolbar}><nav className={styles.periods} aria-label="Период аналитики">{ANALYTICS_PERIODS.map((period) => <Link key={period} href={`/dashboard/analytics?days=${period}`} aria-current={days === period ? "page" : undefined}>{period} дней</Link>)}</nav><p>{dailyCounts.length > 0 && <>{dateLabel(dailyCounts[0].key)} — {dateLabel(dailyCounts[dailyCounts.length - 1].key)}<span>Московское время</span></>}</p></div>
    {noHistory ? <section className={styles.empty}><AnalyticsIcon /><h2>{trackedQr === 0 ? "Начните с QR со статистикой" : "Ждём первое открытие"}</h2><p>{trackedQr === 0 ? "Создайте QR для ссылки и выберите динамический режим. После открытия ссылки здесь появятся график и данные об устройствах." : "Откройте короткую ссылку или отсканируйте свой QR телефоном. Здесь появятся события и их распределение по дням."}</p><Link href={trackedQr === 0 ? "/dashboard/create/url" : "/dashboard/library"} className="fk-button fk-button--primary">{trackedQr === 0 ? "Создать QR-код" : "Открыть мои QR-коды"}</Link><span>Обычные статические коды не передают статистику в кабинет.</span></section> : <>
      <dl className={styles.metrics}>
        <div><dt>Открытия за период</dt><dd>{humanPeriod.toLocaleString("ru-RU")}</dd><p>{humanPrevPeriod === 0 ? growth : `${growth} к предыдущим ${days} дням`}</p></div>
        <div><dt>В среднем за день</dt><dd>{(Math.round(humanPeriod / days * 10) / 10).toLocaleString("ru-RU")}</dd><p>За {days} календарных дней, включая сегодня</p></div>
        <div><dt>Запросы ботов</dt><dd>{botPeriod.toLocaleString("ru-RU")}</dd><p>Учтены отдельно, исключены из графика</p></div>
      </dl>
      <section className={styles.panel}><div className={styles.sectionHead}><div><h2>Открытия по дням</h2><p>Без известных ботов</p></div><span>{days} дней</span></div>
        {humanPeriod > 0 ? <AnalyticsChart key={days} rows={dailyCounts} /> : <div className={styles.chartEmpty}><h3>{noPeriodEvents ? "В этом периоде открытий нет" : "В этом периоде — только боты"}</h3><p>{noPeriodEvents ? `В кабинете сохранено ${totalScans.toLocaleString("ru-RU")} событий за всё время. Выберите другой период, чтобы посмотреть их.` : "Запросы известных ботов не входят в график, среднее и распределение устройств."}</p></div>}
      </section>
      {humanPeriod > 0 && <div className={styles.breakdownGrid}><BreakdownPanel title="Устройства" rows={devices} total={humanPeriod} /><BreakdownPanel title="Операционные системы" rows={operatingSystems} total={humanPeriod} /></div>}
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Последние открытия</h2><span>До 20 событий за период, включая ботов</span></div>
        {recentScans.length === 0 ? <p className={styles.quietEmpty}>За выбранный период событий нет.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">QR-код</th><th scope="col">Дата и время · МСК</th><th scope="col">Устройство</th><th scope="col">Система</th></tr></thead><tbody>{recentScans.map((scan) => <tr key={scan.id}><td><Link href={`/dashboard/qr/${scan.qrId}`}>{scan.name}</Link></td><td><time dateTime={scan.scannedAt}>{new Date(scan.scannedAt).toLocaleDateString("ru-RU", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:ANALYTICS_TIMEZONE})}</time></td><td><span className={styles.mobileLabel}>Устройство</span>{formatDeviceLabel(scan.deviceType)}</td><td><span className={styles.mobileLabel}>Система</span>{scan.os || "Неизвестно"}</td></tr>)}</tbody></table></div>}
      </section>
    </>}
    <details className={styles.method}><summary>Как считаются открытия</summary><div><p>Считаются запросы к ссылкам QR-S: переходы по динамическим QR и размещённым материалам, а также скачивания серверных vCard. Это не обязательно сканирование камерой и не число уникальных посетителей.</p><p>График, среднее и распределения исключают известных ботов. Последние события и CSV включают ботов с отдельной отметкой. География по IP не собирается.</p><p>Периоды считаются по календарным дням в часовом поясе Europe/Moscow. Сегодняшний день ещё не завершён. Сравнение — с предыдущими {days} днями.</p></div></details>
  </div>;
}
