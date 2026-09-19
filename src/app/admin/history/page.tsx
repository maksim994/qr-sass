import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminFilters, AdminPagination } from "@/components/admin/admin-list";
import {
  listParams,
  adminDate,
  type AdminSearchParams,
} from "@/lib/admin-list";
import Link from "next/link";
import styles from "@/components/admin/admin.module.css";
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams,
    { q, size, page: requested } = listParams(params);
  const where: Prisma.AdminAuditLogWhereInput = q
    ? {
        OR: [
          { actorEmail: { contains: q, mode: "insensitive" } },
          { entityId: q },
          { reason: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const db = getDb(),
    total = await db.adminAuditLog.count({ where }),
    page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const events = await db.adminAuditLog.findMany({
    where,
    skip: (page - 1) * size,
    take: size,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return (
    <>
      <AdminPageHeader
        title="История изменений"
        description="Изменения прав администраторов и доступа кабинетов с момента включения журнала."
      />
      <AdminFilters
        params={params}
        placeholder="Email администратора, ID объекта или причина"
      />
      <div className={styles.tableWrap}>
        {events.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата · МСК</th>
                <th>Администратор</th>
                <th>Действие</th>
                <th>Причина и изменения</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="Дата · МСК">{adminDate(event.createdAt)}</td>
                  <td data-label="Администратор">{event.actorEmail}</td>
                  <td data-label="Действие">
                    <Link
                      href={`/admin/${event.action === "admin_role" ? "users" : "workspaces"}/${event.entityId}`}
                    >
                      {event.action === "admin_role"
                        ? "Права администратора"
                        : "Доступ кабинета"}
                    </Link>
                  </td>
                  <td data-label="Причина">
                    {event.reason}
                    <details>
                      <summary>До и после</summary>
                      <pre className={styles.snapshot}>
                        {JSON.stringify(
                          { до: event.before, после: event.after },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            Записей пока нет или они не соответствуют запросу.
          </p>
        )}
      </div>
      <AdminPagination total={total} page={page} size={size} params={params} />
    </>
  );
}
