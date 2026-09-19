import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { QrWizardBackLink } from "@/components/qr/qr-wizard-shared";
import { QrTypeIcon } from "@/components/qr-type-icon";
import { QrLifetimeNote } from "@/components/qr/qr-lifetime-note";
import { TrackedDownloadLink } from "./tracked-download-link";
import { AnalyticsChart } from "./analytics-chart";
import UpdateTarget from "@/components/update-target";
import TrackingPixelsForm from "@/components/tracking-pixels-form";
import QrExpirySettings from "@/components/qr-expiry-settings";
import DeleteQrButton from "@/components/delete-qr-button";
import { contentTypeLabels } from "@/lib/qr-types";
import { needsHostedPage } from "@/lib/qr";
import { formatDeviceLabel, ANALYTICS_TIMEZONE, QR_DETAIL_CHART_DAYS } from "@/lib/analytics-metrics";
import styles from "./qr-detail.module.css";

type Qr = Prisma.QrCodeGetPayload<{ include: { scanEvents: true; _count: { select: { scanEvents: true } } } }>;
type Breakdown = { label: string; count: number }[];
type Props = {
  now: number; qr: Qr; svgString: string; exportFormats: string[];
  scans7d: number; scans30d: number; humanTotal: number;
  devices: Breakdown; osList: Breakdown;
  dailyCounts: { key: string; count: number }[];
  scanCountA: number; scanCountB: number;
};
const number = (value: number) => value.toLocaleString("ru-RU");
const date = (value: Date) => value.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: ANALYTICS_TIMEZONE });
function BreakdownList({title,items}:{title:string;items:Breakdown}) {
  const total = items.reduce((sum,item)=>sum+item.count,0);
  return <section className={styles.panel}><h3>{title}</h3><ul className={styles.breakdown}>{items.map(item=><li key={item.label}><div><span>{item.label}</span><strong>{number(item.count)} <small>· {Math.round(item.count/Math.max(total,1)*100)}%</small></strong></div><div className={styles.track} aria-hidden="true"><span style={{width:`${item.count/Math.max(total,1)*100}%`}}/></div></li>)}</ul></section>;
}
export function QrDetail({now,qr,svgString,exportFormats,scans7d,scans30d,humanTotal,devices,osList,dailyCounts}:Props) {
  const isVcard=qr.contentType==="VCARD";
  const tracks=qr.kind==="DYNAMIC"||isVcard;
  const hosted=needsHostedPage(qr.contentType);
  const publicPath=tracks&&qr.shortCode?`/${isVcard?'v':hosted?'p':'r'}/${qr.shortCode}`:null;
  const expired=tracks&&!!qr.expireAt&&qr.expireAt.getTime()<=now;
  const limitReached=tracks&&qr.maxScans!==null&&qr._count.scanEvents>=qr.maxScans;
  const payload=(qr.payload as Record<string,unknown>|null)??{};
  const hasChart=dailyCounts.some(row=>row.count>0);
  return <div className={styles.detail}>
    <QrWizardBackLink href="/dashboard/library" label="К библиотеке QR"/>
    <header className={styles.header}><QrTypeIcon contentType={qr.contentType} variant="blue"/><div><h1>{qr.name}</h1><p>{contentTypeLabels[qr.contentType]||qr.contentType} · {qr.kind==='DYNAMIC'?'Динамический':'Статический'} · Создан {date(qr.createdAt)}</p></div></header>
    <section className={`${styles.panel} ${styles.overview}`} aria-label="QR-код и основные действия">
      <div className={styles.preview} role="img" aria-label={`QR-код: ${qr.name}`} dangerouslySetInnerHTML={{__html:svgString}}/>
      <div className={styles.summary}>
        <h2>Готов к скачиванию</h2><p>Сохраните QR-код для печати или публикации.</p>
        <div className={styles.downloads}>{exportFormats.map((format,i)=><TrackedDownloadLink key={format} href={`/api/qr/${qr.id}/download?format=${format.toLowerCase()}`} download className={`fk-button ${i===0?'fk-button--primary':'fk-button--secondary'}`} aria-label={`Скачать ${format}`}>{i===0?`Скачать ${format}`:format}</TrackedDownloadLink>)}</div>
        <Link className={styles.edit} href={`/dashboard/qr/${qr.id}/edit`}>Редактировать содержимое и оформление</Link>
        <dl className={styles.facts}>
          {publicPath&&<div><dt>{isVcard?'Файл визитки':hosted?'Страница QR':'Короткая ссылка'}</dt><dd><a href={publicPath} target="_blank" rel="noopener noreferrer">{publicPath}<span className="sr-only"> — откроется в новой вкладке</span></a></dd></div>}
          {qr.currentTargetUrl&&!hosted&&!isVcard&&<div><dt>Куда ведёт код</dt><dd>{qr.currentTargetUrl}</dd></div>}
          {tracks&&<div><dt>Ограничения доступа</dt><dd className={expired||limitReached?styles.warning:undefined}>{expired?'Срок действия истёк':limitReached?'Достигнут лимит открытий':qr.expireAt?`До ${date(qr.expireAt)}`:'Срок не ограничен'}{qr.maxScans!==null&&` · ${number(qr._count.scanEvents)} из ${number(qr.maxScans)} открытий`}{qr.passwordHash?' · Защищён паролем':''}</dd></div>}
        </dl>
        {isVcard&&publicPath&&<a href={publicPath} className={styles.edit}>Скачать текущую визитку .vcf</a>}
      </div>
    </section>
    <details className={styles.lifetime}><summary>Как долго работает QR-код</summary><QrLifetimeNote variant={qr.kind==='DYNAMIC'?'detail-dynamic':'download-static'}/></details>

    {publicPath&&(qr.kind==="DYNAMIC"||(!hosted&&!isVcard))&&<section className={`${styles.panel} ${styles.settings}`} aria-labelledby="qr-settings-title"><h2 id="qr-settings-title">Управление кодом</h2><p>Изменения применяются к уже созданному QR-коду.</p>
      {!hosted&&!isVcard&&<details><summary>Изменить ссылку назначения</summary><UpdateTarget qrId={qr.id} currentUrl={qr.currentTargetUrl}/></details>}
      {qr.kind==='DYNAMIC'&&<details><summary>Срок, лимит открытий и защита</summary><QrExpirySettings qrId={qr.id} expireAt={qr.expireAt} maxScans={qr.maxScans} passwordRequired={!!qr.passwordHash} gdprRequired={payload.gdprRequired===true} gdprPolicyUrl={typeof payload.gdprPolicyUrl==='string'?payload.gdprPolicyUrl:null} scanCount={qr._count.scanEvents}/></details>}
      {qr.contentType==='URL'&&!hosted&&!isVcard&&<>
        <details><summary>Ретаргетинг</summary><TrackingPixelsForm qrId={qr.id} trackingPixels={payload.trackingPixels as {metaPixelId?:string;ga4Id?:string;gtmId?:string;ymCounterId?:string;vkPixelId?:string}??null}/></details>
      </>}
    </section>}

    <section className={styles.analytics} aria-labelledby="qr-analytics-title"><div className={styles.sectionHead}><h2 id="qr-analytics-title">{isVcard?'Запросы скачивания визитки':'Статистика QR-кода'}</h2>{tracks&&<span>Время по Москве</span>}</div>
      {!tracks?<div className={styles.panel}><h3>Статический код работает без отслеживания</h3><p>Его содержимое считывается напрямую. Для статистики создайте новый QR-код в динамическом режиме.</p><Link className={styles.edit} href="/dashboard/create">Создать QR-код</Link></div>:qr._count.scanEvents===0?<div className={`${styles.panel} ${styles.empty}`}><h3>{isVcard?'Запросов скачивания пока нет':'Открытий пока нет'}</h3><p>{isVcard?'Поделитесь визиткой. Здесь появится статистика запросов её файла.':'Скачайте код и разместите его на сайте или печатных материалах. Здесь появятся открытия, устройства и история.'}</p></div>:<>
        <dl className={`${styles.panel} ${styles.stats}`}>{[{label:'За всё время',value:humanTotal},{label:'За 7 дней',value:scans7d},{label:`За ${QR_DETAIL_CHART_DAYS} дней`,value:scans30d}].map(item=><div key={item.label}><dt>{item.label}</dt><dd>{number(item.value)}</dd></div>)}</dl>
        <p className={styles.method}>Без известных ботов. Запросов ботов за всё время: {number(Math.max(0,qr._count.scanEvents-humanTotal))}.</p>
        <section className={styles.panel}><h3>{isVcard?'Запросы по дням':'Открытия по дням'}</h3><p>Последние {QR_DETAIL_CHART_DAYS} дней · без известных ботов</p>{hasChart?<AnalyticsChart rows={dailyCounts} metricLabel={isVcard?"Запросы скачивания":"Открытия"}/>:<p className={styles.periodEmpty}>За этот период событий без известных ботов нет.</p>}</section>
        {hasChart&&<div className={styles.breakdowns}><BreakdownList title="Устройства" items={devices}/><BreakdownList title="Операционные системы" items={osList}/></div>}
        <details className={`${styles.panel} ${styles.history}`}><summary>Последние события <span>До 50, включая ботов</span></summary><table><caption className="sr-only">Последние события QR-кода, время по Москве</caption><thead><tr><th scope="col">Дата · МСК</th><th scope="col">Устройство</th><th scope="col">Система</th></tr></thead><tbody>{qr.scanEvents.map(scan=><tr key={scan.id}><td><time dateTime={scan.scannedAt.toISOString()}>{scan.scannedAt.toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:ANALYTICS_TIMEZONE})}</time></td><td><span className={styles.mobileLabel}>Устройство</span>{formatDeviceLabel(scan.deviceType)}</td><td><span className={styles.mobileLabel}>Система</span>{scan.os||'—'}</td></tr>)}</tbody></table></details>
      </>}
    </section>
    <footer className={styles.footer}><p>Перед удалением проверьте, где используется этот код.</p><DeleteQrButton qrId={qr.id} qrName={qr.name} kind={qr.kind}/></footer>
  </div>;
}
