"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrackedDownloadLink } from "@/components/dashboard/tracked-download-link";
import { QrLibraryCardMenu } from "@/components/dashboard/qr-library-card-menu";
import { QrTypeIcon } from "@/components/qr-type-icon";
import { LogoMark } from "@/components/logo-mark";
import { libraryDestination, libraryHref, libraryStatus, type LibraryKindFilter, type LibraryQuery } from "@/lib/library-query";
import styles from "./qr-library.module.css";

type QrItem = {
  id: string;
  name: string;
  kind: "STATIC" | "DYNAMIC";
  contentType: string;
  createdAt: string;
  expireAt: string | null;
  currentTargetUrl: string | null;
  shortCode: string | null;
  encodedContent: string | null;
  publicPath: string | null;
  _count: { scanEvents: number };
};

type Props = {
  items: QrItem[];
  contentTypeLabels: Record<string, string>;
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
  query: LibraryQuery;
  total: number;
  pageSize: number;
};

const tabs: { key: LibraryKindFilter; label: string }[] = [
  { key: "ALL", label: "Все коды" },
  { key: "STATIC", label: "Статические" },
  { key: "DYNAMIC", label: "Динамические" },
];

function SearchIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
}

export default function QrLibrary({ items, contentTypeLabels, exportFormats, query, total, pageSize }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const filtered = !!query.q || query.kind !== "ALL";

  return (
    <section className={styles.library} aria-label="Библиотека QR-кодов" aria-busy={pending}>
      <div className={styles.toolbar}>
        <nav className={styles.filters} aria-label="Вид QR-кода">
          {tabs.map((tab) => (
            <Link key={tab.key} href={libraryHref({ q: query.q, kind: tab.key })} className={styles.filter} aria-current={query.kind === tab.key ? "page" : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <form className={styles.search} method="get" action="/dashboard/library" role="search" onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const data = new FormData(event.currentTarget);
          startTransition(() => router.push(libraryHref({ q: String(data.get("q") ?? ""), kind: query.kind }), { scroll: false }));
        }}>
          <SearchIcon />
          <input key={query.q} type="search" name="q" defaultValue={query.q} placeholder="Название, ссылка или код" className="fk-input" aria-label="Поиск QR-кодов" maxLength={200} />
          {query.kind !== "ALL" ? <input type="hidden" name="kind" value={query.kind} /> : null}
          <button type="submit" className={`fk-button fk-button--secondary ${styles.searchSubmit}`} disabled={pending}>{pending ? "Поиск…" : "Найти"}</button>
        </form>
      </div>
      <div className={styles.results}>
        <p className="tnum" role="status" aria-live="polite">{pending ? "Ищем QR-коды…" : items.length ? `${from}–${to} из ${total}` : "0 кодов"}{filtered ? " · по вашему запросу" : ""}</p>
        {filtered ? <Link href="/dashboard/library">Сбросить фильтры</Link> : <span>Сначала новые</span>}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">{filtered ? <SearchIcon /> : <LogoMark size={52} />}</div>
          <h2>{filtered ? "Таких QR-кодов пока нет" : "Ваш первый QR-код — здесь"}</h2>
          <p>{filtered ? "Попробуйте другое название или ссылку. Можно сбросить фильтры и посмотреть все коды." : "Добавьте ссылку или другой контент, настройте оформление и скачайте код. Он появится в этом списке."}</p>
          <Link href={filtered ? "/dashboard/library" : "/dashboard/create"} className={`fk-button ${filtered ? "fk-button--secondary" : "fk-button--primary"}`}>{filtered ? "Показать все коды" : "Создать первый QR-код"}</Link>
          {!filtered && <ol className={styles.steps}><li>Выберите содержимое</li><li>Настройте дизайн</li><li>Скачайте и поделитесь</li></ol>}
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Ваши QR-коды, их тип, статистика и действия</caption>
            <thead><tr><th scope="col">QR-код</th><th scope="col">Тип</th><th scope="col">Открытия</th><th scope="col">Создан</th><th scope="col"><span className={styles.srOnly}>Действия</span></th></tr></thead>
            <tbody>
              {items.map((qr) => {
                const tracksScans = qr.kind === "DYNAMIC" || qr.contentType === "VCARD";
                const destination = libraryDestination(qr);
                const status = libraryStatus(qr);
                return (
                  <tr key={qr.id}>
                    <td className={styles.identityCell}>
                      <div className={styles.identity}>
                        <QrTypeIcon contentType={qr.contentType} variant="slate" />
                        <div className={styles.nameBlock}>
                          <Link href={`/dashboard/qr/${qr.id}`} className={styles.name} title={qr.name}>{qr.name}</Link>
                          <p className={styles.destination} title={destination}>{destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className={styles.typeCell}><span className={styles.type}>{contentTypeLabels[qr.contentType] || qr.contentType}</span><span className={`${styles.kind} ${status === "Срок истёк" ? styles.expired : ""}`}>{qr.kind === "DYNAMIC" && status !== "Срок истёк" && <span className={styles.dot} aria-hidden="true" />}{status}</span></td>
                    <td className={styles.scansCell}><span className={styles.mobileLabel}>Открытия</span><span className={styles.scans} title={!tracksScans ? "Для этого статического кода статистика не собирается" : undefined}>{tracksScans ? qr._count.scanEvents.toLocaleString("ru-RU") : "—"}</span>{qr.contentType === "VCARD" && <span className={styles.kind}>скачиваний vCard</span>}</td>
                    <td className={styles.dateCell}><time dateTime={qr.createdAt}>{new Date(qr.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Moscow" })}</time></td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actions}>
                        {exportFormats.includes("PNG") && <TrackedDownloadLink href={`/api/qr/${qr.id}/download?format=png`} className={styles.download} download aria-label={`Скачать PNG: ${qr.name}`}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg><span>Скачать</span></TrackedDownloadLink>}
                        <QrLibraryCardMenu qrId={qr.id} qrName={qr.name} kind={qr.kind} exportFormats={exportFormats} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className={styles.listFoot}>
            <p>Открытия включают запросы ботов. Для статических кодов, кроме vCard, статистика не собирается.</p>
            {pageCount > 1 && <nav className={styles.pager} aria-label="Страницы библиотеки">
              {page > 1 ? <Link href={libraryHref({ ...query, page: page - 1 })}>Назад</Link> : <span aria-disabled="true">Назад</span>}
              <span className="tnum">{page} из {pageCount}</span>
              {page < pageCount ? <Link href={libraryHref({ ...query, page: page + 1 })}>Вперёд</Link> : <span aria-disabled="true">Вперёд</span>}
            </nav>}
          </div>
        </>
      )}
    </section>
  );
}
