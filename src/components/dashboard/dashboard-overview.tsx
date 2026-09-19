import Link from "next/link";
import { DashboardPageHeader } from "./dashboard-page-header";
import { OnboardingChecklist } from "./onboarding-checklist";
import { ResumeCreateDraft } from "./resume-create-draft";
import { QrTypeIcon } from "@/components/qr-type-icon";
import { contentTypeLabels } from "@/lib/qr-types";
import { formatUsage, type PlanInfo } from "@/lib/plans";
import type { EntitlementStatus } from "@/lib/entitlements";
import styles from "./dashboard-overview.module.css";

type Props = {
  totalQr: number;
  dynamicCount: number;
  scanCount7d: number | null;
  memberCount: number;
  plan: PlanInfo;
  status: EntitlementStatus;
  periodEnd: string | null;
  canTrackOpens: boolean;
  activation: { hasQr: boolean; hasDownload: boolean; hasFirstExternalOpen: boolean };
  recentQrs: Array<{ id: string; name: string; kind: "STATIC" | "DYNAMIC"; contentType: string; createdAt: string; scanCount: number }>;
};

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

function MetricIcon({ type }: { type: string }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "total" ? <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h4v4h-7v-3m7-4v-1" /></>
      : type === "static" ? <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>
      : type === "dynamic" ? <><path d="M20 8a8 8 0 0 0-14-2L3 9m0-5v5h5M4 16a8 8 0 0 0 14 2l3-3m0 5v-5h-5" /></>
      : <><path d="M4 20V10m8 10V4m8 16v-7" /><path d="M2 20h20" /></>}
  </svg>;
}

export function DashboardOverview({ totalQr, dynamicCount, scanCount7d, memberCount, plan, status, periodEnd, canTrackOpens, activation, recentQrs }: Props) {
  const qrLimit = plan.limits.maxQrCodes;
  const limitReached = qrLimit !== null && totalQr >= qrLimit;
  const dateLabel = periodEnd ? new Date(periodEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" }) : null;
  const metrics = [
    { id: "total", label: "Всего кодов", value: totalQr, hint: "В вашей библиотеке", href: "/dashboard/library" },
    { id: "static", label: "Статических", value: totalQr - dynamicCount, hint: "С неизменным содержимым", href: "/dashboard/library?kind=STATIC" },
    { id: "dynamic", label: "Динамических", value: dynamicCount, hint: "Со сменой назначения", href: "/dashboard/library?kind=DYNAMIC" },
    ...(scanCount7d !== null ? [{ id: "opens", label: "Открытий за 7 дней", value: scanCount7d, hint: "Перейти к аналитике", href: "/dashboard/analytics" }] : []),
  ];

  return <div className={styles.overview}>
    <DashboardPageHeader title="Обзор" description={totalQr === 0 ? "Всё готово для вашего первого QR-кода." : canTrackOpens ? "Ваши коды, последние открытия и возможности кабинета." : "Последние QR-коды и возможности вашего кабинета."}
      action={totalQr > 0 ? <Link href="/dashboard/create" className="fk-button fk-button--primary">Создать QR-код</Link> : undefined} />
    <ResumeCreateDraft />
    <OnboardingChecklist {...activation} canTrackOpens={canTrackOpens} />

    {totalQr > 0 && <section className={`${styles.metrics} ${metrics.length === 4 ? styles.metricsFour : ""}`} aria-label="Сводка по QR-кодам">
      {metrics.map((metric) => <Link key={metric.id} href={metric.href} className={`${styles.metric} ${metric.id === "total" ? styles.metricTotal : ""}`}>
        <span className={styles.metricHead}><MetricIcon type={metric.id} /><span>{metric.label}</span><span className={styles.metricArrow}><Arrow /></span></span>
        <strong className={styles.metricValue}>{metric.value.toLocaleString("ru-RU")}</strong>
        <span className={styles.metricHint}>{metric.hint}</span>
      </Link>)}
    </section>}

    <div className={styles.columns}>
      <section className={styles.recent} aria-labelledby="recent-qr-heading">
        <div className={styles.sectionHead}><h2 id="recent-qr-heading">Последние QR-коды</h2>{recentQrs.length > 0 && <Link href="/dashboard/library">Все коды <Arrow /></Link>}</div>
        {recentQrs.length === 0 ? <div className={styles.empty}>
          <svg className={styles.emptyIcon} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><path d="M15 15h3v3h3m-6 0v3m6-6v-3M3 12h3m6-9v3m0 6v3m0 6h3" /></svg>
          <h3>С чего начнём?</h3>
          <p>Превратите ссылку в QR-код или выберите другой тип содержимого. Готовые коды будут храниться здесь.</p>
          <div className={styles.emptyActions}><Link href="/dashboard/create/url" className="fk-button fk-button--primary">Создать QR для ссылки <Arrow /></Link><Link href="/dashboard/create" className={styles.textLink}>Другие типы QR</Link></div>
          <span className={styles.emptyNote}>Вы сможете настроить оформление перед скачиванием.</span>
        </div> : <ul className={styles.recentList}>
          {recentQrs.map((qr) => {
            const tracked = canTrackOpens && (qr.kind === "DYNAMIC" || qr.contentType === "VCARD");
            return <li key={qr.id}><Link href={`/dashboard/qr/${qr.id}`} className={styles.qrRow}>
              <QrTypeIcon contentType={qr.contentType} variant="slate" />
              <div className={styles.qrInfo}><h3>{qr.name}</h3><p>{contentTypeLabels[qr.contentType] || qr.contentType}<span aria-hidden="true"> · </span>{qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}</p></div>
              <div className={styles.qrMeta}>{tracked ? <><strong>{qr.scanCount.toLocaleString("ru-RU")}</strong><span>{qr.contentType === "VCARD" ? "скачиваний vCard" : "открытий"}</span></> : <time dateTime={qr.createdAt}>{new Date(qr.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" })}</time>}</div>
              <span className={styles.rowArrow}><Arrow /></span>
            </Link></li>;
          })}
        </ul>}
      </section>
      <aside className={styles.aside} aria-label="Тариф и подсказка">
        <section className={styles.plan} aria-labelledby="overview-plan-heading">
          <div className={styles.planHead}><h2 id="overview-plan-heading">Тариф «{plan.name}»</h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg></div>
          {status === "trial" && <p className={styles.planStatus}>Пробный период{dateLabel ? ` до ${dateLabel}` : ""}</p>}
          {status === "active" && dateLabel && <p className={styles.planStatus}>Оплачен до {dateLabel}</p>}
          {status === "canceled" && plan.id !== "FREE" && <p className={styles.planStatus}>Действует до {dateLabel}. Продление отключено.</p>}
          {(status === "expired" || (status === "canceled" && plan.id === "FREE")) && <p className={styles.planStatus}>Платный период завершён. Действуют условия бесплатного тарифа.</p>}
          <dl className={styles.usage}><div><dt>QR-коды</dt><dd>{formatUsage(totalQr, qrLimit)}{qrLimit === null && <span>без лимита</span>}</dd></div><div><dt>Участники</dt><dd>{formatUsage(memberCount, plan.limits.maxUsers)}{plan.limits.maxUsers === null && <span>без лимита</span>}</dd></div></dl>
          {limitReached && <p className={styles.limitNote}>Лимит кодов достигнут. Выберите тариф с большим лимитом, чтобы создавать новые.</p>}
          <Link href="/dashboard/billing" className={styles.planLink}>Управление тарифом <Arrow /></Link>
        </section>
        <div className={styles.hint}>
          <h2>После печати</h2>
          <p>У статического QR содержимое остаётся прежним. У динамического можно менять ссылку, сохраняя напечатанный код.</p>
          <Link href="/qr-lifetime">Как это работает <span aria-hidden="true">↗</span></Link>
        </div>
      </aside>
    </div>
  </div>;
}
