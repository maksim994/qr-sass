import { getDb } from "@/lib/db";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const db = getDb();
  const users = await db.user.findMany({
    include: {
      memberships: {
        include: { workspace: true },
      },
      _count: { select: { qrCodes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Пользователи</h1>
      <p className="mt-1 text-slate-600">Список всех пользователей, тариф можно изменить</p>

      <UsersTable users={users} />
    </div>
  );
}
