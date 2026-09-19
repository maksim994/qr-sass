import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminFilters, AdminPagination } from "@/components/admin/admin-list";
import {
  listParams,
  scalar,
  adminDate,
  adminPlanLabels,
  workspacePlanLabel,
  type AdminSearchParams,
} from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { q, size, page: requested } = listParams(params);
  const plan = scalar(params.plan);
  const role = scalar(params.role);
  const days = [7, 30, 90].includes(Number(scalar(params.days)))
    ? Number(params.days)
    : null;
  const where: Prisma.UserWhereInput = {
    ...(days
      ? { createdAt: { gte: new Date(new Date().getTime() - days * 86400000) } }
      : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { id: q },
            {
              memberships: {
                some: {
                  workspace: { name: { contains: q, mode: "insensitive" } },
                },
              },
            },
          ],
        }
      : {}),
    ...(["FREE", "PRO", "BUSINESS"].includes(plan)
      ? {
          memberships: {
            some: { workspace: { plan: plan as "FREE" | "PRO" | "BUSINESS" } },
          },
        }
      : {}),
    ...(role === "admin"
      ? { isAdmin: true }
      : role === "user"
        ? { isAdmin: false }
        : {}),
  };
  const db = getDb();
  const total = await db.user.count({ where });
  const page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const users = await db.user.findMany({
    where,
    skip: (page - 1) * size,
    take: size,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      memberships: {
        orderBy: { workspaceId: "asc" },
        select: {
          role: true,
          workspace: { select: { id: true, name: true, plan: true, accessMode: true } },
        },
      },
      _count: { select: { qrCodes: { where: { isArchived: false } } } },
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Клиенты"
        description="Пользователи, их кабинеты и доступ к сервису."
      />
      <AdminFilters
        params={params}
        placeholder="Email, имя, ID или название кабинета"
        filters={[
          {
            name: "plan",
            label: "Тариф кабинета",
            options: [["", "Все тарифы"], ...Object.entries(adminPlanLabels)],
          },
          {
            name: "role",
            label: "Права",
            options: [
              ["", "Все пользователи"],
              ["admin", "Администраторы"],
              ["user", "Пользователи"],
            ],
          },
        ]}
      />
      <div className={styles.tableWrap}>
        {users.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Кабинеты и тарифы</th>
                <th>Активные QR</th>
                <th>Регистрация · МСК</th>
                <th>Права</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Пользователь">
                    <Link href={`/admin/users/${user.id}`}>
                      {user.name || user.email}
                    </Link>
                    {user.name && <small>{user.email}</small>}
                  </td>
                  <td data-label="Кабинеты">
                    {user.memberships.length
                      ? user.memberships.map(({ workspace }) => (
                          <div key={workspace.id}>
                            <Link href={`/admin/workspaces/${workspace.id}`}>
                              {workspace.name}
                            </Link>
                            <small>{workspacePlanLabel(workspace)}</small>
                          </div>
                        ))
                      : "Нет кабинетов"}
                  </td>
                  <td data-label="Активные QR">{user._count.qrCodes}</td>
                  <td data-label="Регистрация · МСК">
                    {adminDate(user.createdAt)}
                  </td>
                  <td data-label="Права">
                    {user.isAdmin ? "Администратор" : "Пользователь"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            Клиенты не найдены. Измените запрос или сбросьте фильтры.
          </p>
        )}
      </div>
      <AdminPagination total={total} page={page} size={size} params={params} />
    </>
  );
}
