import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { Select, Button } from "@/components/ui";
import { adminDate, scalar, type AdminSearchParams } from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(scalar(params.days)))
    ? Number(params.days)
    : 30;
  const since = new Date(new Date().getTime() - days * 86400000);
  const db = getDb();
  const [users, codes, archived, paid, pending, recent] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.qrCode.count({ where: { isArchived: false } }),
    db.qrCode.count({ where: { isArchived: true } }),
    db.payment.aggregate({
      where: { status: "SUCCEEDED", isTest: false, createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.count({
      where: {
        status: "PENDING",
        isTest: false,
        createdAt: { lte: new Date(new Date().getTime() - 30 * 60000) },
      },
    }),
    db.adminAuditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actorEmail: true,
        action: true,
        reason: true,
        createdAt: true,
      },
    }),
  ]);
  const metrics = [
    {
      label: `Регистрации за ${days} дней`,
      value: users,
      href: `/admin/users?days=${days}`,
    },
    { label: "Активные QR-коды", value: codes, href: "/admin/qr" },
    {
      label: "QR-коды в архиве",
      value: archived,
      href: "/admin/qr?status=archived",
    },
    {
      label: `Оплачено по платежам, созданным за ${days} дней`,
      value: `${(paid._sum.amount ?? 0).toLocaleString("ru-RU")} ₽`,
      href: `/admin/payments?status=SUCCEEDED&days=${days}`,
    },
  ];
  return (
    <>
      <AdminPageHeader
        title="Обзор сервиса"
        description="Клиенты, платежи и последние административные изменения."
        action={
          <form className={styles.actions}>
            <label htmlFor="admin-period">Период</label>
            <Select id="admin-period" name="days" defaultValue={days}>
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  {n} дней
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Применить
            </Button>
          </form>
        }
      />
      <div
        className="qrs-dash-stat-grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 24,
        }}
      >
        {metrics.map((metric) => (
          <Link className={styles.panel} href={metric.href} key={metric.label}>
            <p className={styles.note}>{metric.label}</p>
            <p
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "var(--text-strong)",
                marginTop: 12,
              }}
            >
              {metric.value}
            </p>
          </Link>
        ))}
      </div>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.title}>Платежи, требующие проверки</h2>
          {pending ? (
            <>
              <p>Ожидают оплаты дольше 30 минут: {pending}.</p>
              <p className={styles.note}>
                Это не обязательно ошибка. Откройте платёж, чтобы проверить
                события и сверить статус.
              </p>
              <Link
                className={styles.link}
                href="/admin/payments?status=PENDING&stale=1"
              >
                Открыть ожидающие платежи
              </Link>
            </>
          ) : (
            <p className={styles.note}>
              Реальных платежей, ожидающих оплаты дольше 30 минут, сейчас нет.
            </p>
          )}
          <p className={styles.note} style={{ marginTop: 20 }}>
            В сумме оплат учтены только реальные платежи со статусом «Оплачен».
            Тестовые платежи и ручная выдача доступа исключены.
          </p>
        </section>
        <section className={styles.panel}>
          <h2 className={styles.title}>Последние изменения</h2>
          <div className={styles.history}>
            {recent.map((event) => (
              <article key={event.id}>
                <time>{adminDate(event.createdAt)} · МСК</time>
                <p>{event.actorEmail}</p>
                <p>{event.reason}</p>
              </article>
            ))}
            {!recent.length && (
              <p className={styles.note}>
                Изменений после включения журнала пока нет.
              </p>
            )}
          </div>
          <Link className={styles.link} href="/admin/history">
            Весь журнал
          </Link>
        </section>
      </div>
      <div className={styles.actions} style={{ marginTop: 24 }}>
        <Link className={styles.link} href="/admin/users">
          Найти клиента
        </Link>
        <Link className={styles.link} href="/admin/qr">
          Найти QR-код
        </Link>
        <Link className={styles.link} href="/admin/funnel">
          Воронка активации
        </Link>
      </div>
    </>
  );
}
