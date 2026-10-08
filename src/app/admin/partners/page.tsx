import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminPageHeader, AdminCard, AdminDataCard } from "@/components/admin/admin-page";
import { listPartnerReport } from "@/lib/partners";
import { summarizePartnerPayments } from "@/lib/partner-rules";
import { publicSiteUrl } from "@/lib/public-url";
import { PartnerCreateForm, PartnerActions } from "./partners-client";
import styles from "./partners.module.css";

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  await requireAdmin();
  const isTest = (await searchParams).test === "1";
  const partners = await listPartnerReport(isTest);
  const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;
  return <div className={styles.page}>
    <AdminPageHeader title="Партнёры" description="Персональные ссылки и результат привлечения. Первый партнёр закрепляется на 30 дней до регистрации; после регистрации связь сохраняется." />
    <AdminCard><h2>Новый партнёр</h2><PartnerCreateForm /></AdminCard>
    <div className={styles.explanation}>
      <p>За всё время · <strong>{isTest ? "Тестовые данные" : "Реальные клиенты"}</strong> · <Link href={isTest ? "/admin/partners" : "/admin/partners?test=1"}>{isTest ? "Показать реальные данные" : "Показать тестовые данные"}</Link></p>
      <p>Учитываем переходы после согласия на аналитику. Посетители — браузеры с партнёрской cookie, не уникальные люди. «Результат» — клиент создал и скачал статический QR либо получил первое внешнее открытие своего динамического QR.</p>
    </div>
    {partners.length === 0 ? <AdminCard><h2>Партнёров пока нет</h2><p>Добавьте первого партнёра выше и передайте ему персональную ссылку.</p></AdminCard> : <AdminDataCard>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Статистика партнёров, таблица прокручивается по горизонтали">
        <table className={styles.table}>
          <caption className="sr-only">Статистика привлечения за всё время</caption>
          <thead><tr><th>Партнёр и ссылка</th><th>Переходы</th><th>Посетители</th><th>Регистрации</th><th>Результат</th><th>Триалы</th><th>Первые оплаты</th><th>Повторные</th><th>Выручка</th><th>Действия</th></tr></thead>
          <tbody>{partners.map(p => {
            const url = new URL(publicSiteUrl()); url.searchParams.set("ref", p.code);
            const payments = summarizePartnerPayments(p.workspaces.flatMap(w => w.payments));

            return <tr key={p.id}>
              <th scope="row"><strong>{p.name}</strong><span>{p.enabled ? "Активен" : "Приостановлен"}</span><a href={url.toString()} target="_blank" rel="noopener noreferrer">{url.toString()}</a></th>
              <td>{p.visits.reduce((sum, v) => sum + v.clicks, 0)}</td><td>{p.visits.length}</td><td>{p.workspaces.length}</td><td>{p.activated}</td><td>{p.workspaces.filter(w => w.trialUsedAt).length}</td><td>{payments.firstPayments}</td><td>{payments.renewals}</td>
              <td><strong>{money(payments.netRub)}</strong><span>Оплаты: {money(payments.grossRub)}</span><span>Возвраты: {money(payments.refundedRub)}</span></td>
              <td><PartnerActions id={p.id} enabled={p.enabled} url={url.toString()} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </AdminDataCard>}
    <p className={styles.note}>Приостановка прекращает новые привязки. Статистика и оплаты ранее привлечённых клиентов сохраняются. Выручка показана в рублях за вычетом платежей со статусом «Возврат»; это не расчёт партнёрского вознаграждения.</p>
  </div>;
}
