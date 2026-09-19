import { getDb } from "@/lib/db";
import { AdminsList } from "./admins-list";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminFilters, AdminPagination } from "@/components/admin/admin-list";
import { listParams, type AdminSearchParams } from "@/lib/admin-list";
import { Prisma } from "@prisma/client";
export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams,
    { q, size, page: requested } = listParams(params);
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const db = getDb(),
    total = await db.user.count({ where }),
    page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const users = await db.user.findMany({
    where,
    skip: (page - 1) * size,
    take: size,
    orderBy: [{ isAdmin: "desc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  return (
    <>
      <AdminPageHeader
        title="Администраторы"
        description="Глобальные права на управление сервисом. Каждое изменение записывается в журнал."
      />
      <AdminFilters params={params} placeholder="Email или имя" />
      <AdminsList initialUsers={users} />
      <AdminPagination total={total} page={page} size={size} params={params} />
    </>
  );
}
