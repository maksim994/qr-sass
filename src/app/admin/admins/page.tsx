import { getDb } from "@/lib/db";
import { AdminsList } from "./admins-list";

export default async function AdminAdminsPage() {
  const db = getDb();
  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Администраторы</h1>
      <p className="mt-1 text-slate-600">Назначьте пользователей администраторами для доступа к панели /admin</p>

      <AdminsList initialUsers={users} />
    </div>
  );
}
