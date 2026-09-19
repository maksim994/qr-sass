import { Prisma } from "@prisma/client";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminFilters, AdminPagination } from "@/components/admin/admin-list";
import {
  listParams,
  scalar,
  adminDate,
  adminPlanLabels,
  type AdminSearchParams,
} from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
const statuses: Record<string, string> = {
  PENDING: "Ожидает оплаты",
  SUCCEEDED: "Оплачен",
  CANCELED: "Отменён",
  REFUNDED: "Возвращён",
};
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams,
    { q, size, page: requested } = listParams(params),
    status = scalar(params.status),
    kind = scalar(params.kind),
    workspace = scalar(params.workspace);
  const days = [7, 30, 90].includes(Number(scalar(params.days)))
    ? Number(params.days)
    : null;
  const stale = scalar(params.stale) === "1";
  const where: Prisma.PaymentWhereInput = {
    ...(days || stale
      ? {
          createdAt: {
            ...(days
              ? { gte: new Date(new Date().getTime() - days * 86400000) }
              : {}),
            ...(stale
              ? { lte: new Date(new Date().getTime() - 30 * 60000) }
              : {}),
          },
        }
      : {}),
    ...(workspace ? { workspaceId: workspace } : {}),
    ...(status in statuses
      ? { status: status as "PENDING" | "SUCCEEDED" | "CANCELED" | "REFUNDED" }
      : {}),
    ...(kind === "all" ? {} : { isTest: kind === "test" }),
    ...(q
      ? {
          OR: [
            { providerPaymentId: { contains: q, mode: "insensitive" } },
            { id: q },
            { workspace: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const db = getDb(),
    total = await db.payment.count({ where }),
    page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const payments = await db.payment.findMany({
    where,
    skip: (page - 1) * size,
    take: size,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      providerPaymentId: true,
      amount: true,
      currency: true,
      status: true,
      isTest: true,
      planId: true,
      createdAt: true,
      workspace: { select: { id: true, name: true } },
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Платежи"
        description="Подтверждённые сервером статусы. Ручная выдача доступа не считается оплатой."
      />
      {workspace && (
        <p className={styles.note}>
          Кабинет:{" "}
          <Link className={styles.link} href={`/admin/workspaces/${workspace}`}>
            {workspace}
          </Link>
        </p>
      )}
      <AdminFilters
        params={params}
        placeholder="ID платежа или название кабинета"
        filters={[
          {
            name: "status",
            label: "Статус",
            options: [["", "Все статусы"], ...Object.entries(statuses)],
          },
          {
            name: "kind",
            label: "Платежи",
            options: [
              ["", "Реальные"],
              ["test", "Тестовые"],
              ["all", "Все"],
            ],
          },
        ]}
      />
      <div className={styles.tableWrap}>
        {payments.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Платёж</th>
                <th>Кабинет</th>
                <th>Сумма / тариф</th>
                <th>Статус</th>
                <th>Создан · МСК</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td data-label="Платёж">
                    <Link href={`/admin/payments/${payment.id}`}>
                      {payment.providerPaymentId}
                    </Link>
                    {payment.isTest && <small>Тестовый платёж</small>}
                  </td>
                  <td data-label="Кабинет">
                    <Link href={`/admin/workspaces/${payment.workspace.id}`}>
                      {payment.workspace.name}
                    </Link>
                  </td>
                  <td data-label="Сумма / тариф">
                    {payment.amount.toLocaleString("ru-RU")} {payment.currency}
                    <small>
                      {payment.planId ? adminPlanLabels[payment.planId] : "—"}
                    </small>
                  </td>
                  <td data-label="Статус">
                    {statuses[payment.status] ?? payment.status}
                  </td>
                  <td data-label="Создан · МСК">
                    {adminDate(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            Платежей по выбранным условиям пока нет.
          </p>
        )}
      </div>
      <AdminPagination total={total} page={page} size={size} params={params} />
    </>
  );
}
