import { getDb } from "@/lib/db";
import { AdminsList } from "./admins-list";
import { AdminPageHeader, AdminDataCard } from "@/components/admin/admin-page";

export default async function AdminAdminsPage() {
  const db = getDb();
  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return (
    <div>
      <AdminPageHeader
        title="Администраторы"
        description="Назначьте пользователей администраторами для доступа к панели /admin"
      />
      <AdminDataCard>
        <AdminsList initialUsers={users} />
      </AdminDataCard>
    </div>
  );
}
