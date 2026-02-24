import { getDb } from "@/lib/db";
import { AdminsList } from "./admins-list";

export default async function AdminAdminsPage() {
  const db = getDb();
  const users = await db.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Администраторы</h1>
        <p className="mt-1 text-sm text-slate-500">Назначьте пользователей администраторами для доступа к панели /admin</p>
      </div>
      <div className="card overflow-hidden">
        <AdminsList initialUsers={users} />
      </div>
    </div>
  );
}
