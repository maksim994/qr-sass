import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ReconcilePayment } from "@/components/admin/reconcile-payment";
import { adminDate, adminPlanLabels } from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const payment = await getDb().payment.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      providerPaymentId: true,
      amount: true,
      currency: true,
      status: true,
      isTest: true,
      planId: true,
      createdAt: true,
      updatedAt: true,
      workspace: { select: { id: true, name: true } },
      billingEvents: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, message: true, createdAt: true },
      },
    },
  });
  if (!payment) notFound();
  const status = {
    PENDING: "Ожидает оплаты",
    SUCCEEDED: "Оплачен",
    CANCELED: "Отменён",
    REFUNDED: "Возвращён",
  }[payment.status];
  return (
    <>
      <Link href="/admin/payments" className={styles.back}>
        К платежам
      </Link>
      <AdminPageHeader title="Платёж" description={payment.providerPaymentId} />
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.title}>
            {payment.amount.toLocaleString("ru-RU")} {payment.currency} ·{" "}
            {status}
          </h2>
          <dl className={styles.meta}>
            <dt>Кабинет</dt>
            <dd>
              <Link
                className={styles.link}
                href={`/admin/workspaces/${payment.workspace.id}`}
              >
                {payment.workspace.name}
              </Link>
            </dd>
            <dt>Тариф</dt>
            <dd>{payment.planId ? adminPlanLabels[payment.planId] : "—"}</dd>
            <dt>Режим</dt>
            <dd>{payment.isTest ? "Тестовый платёж" : "Реальный платёж"}</dd>
            <dt>Создан · МСК</dt>
            <dd>{adminDate(payment.createdAt)}</dd>
            <dt>Обновлён · МСК</dt>
            <dd>{adminDate(payment.updatedAt)}</dd>
          </dl>
          <div className={styles.form} style={{ marginTop: 24 }}>
            <p className={styles.note}>
              Сверка запрашивает актуальный статус у ЮKassa. Подтверждённая
              оплата может активировать доступ кабинета.
            </p>
            <ReconcilePayment providerPaymentId={payment.providerPaymentId} />
          </div>
        </section>
        <section className={styles.panel}>
          <h2 className={styles.title}>События платежа</h2>
          <div className={styles.history}>
            {payment.billingEvents.map((event) => (
              <article key={event.id}>
                <time>{adminDate(event.createdAt)} · МСК</time>
                <p>{event.type}</p>
                {event.message && <p>{event.message}</p>}
              </article>
            ))}
            {!payment.billingEvents.length && (
              <p className={styles.note}>Событий пока нет.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
