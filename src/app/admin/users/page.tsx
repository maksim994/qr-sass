import { getDb } from "@/lib/db";
import { UsersTable } from "./users-table";
import { AdminPageHeader, AdminDataCard } from "@/components/admin/admin-page";

export default async function AdminUsersPage() {
  const db = getDb();
  const users = await db.user.findMany({
    include: {
      memberships: {
        include: {
          workspace: {
            include: { subscription: true },
          },
        },
      },
      _count: { select: { qrCodes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <AdminPageHeader
        title="Пользователи"
        description="Список всех пользователей. Тариф можно изменить для каждого workspace."
      />
      <AdminDataCard>
        <UsersTable users={users} />
      </AdminDataCard>
    </div>
  );
}
