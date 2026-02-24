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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Пользователи</h1>
        <p className="mt-1 text-sm text-slate-500">Список всех пользователей. Тариф можно изменить для каждого workspace.</p>
      </div>
      <div className="card overflow-hidden">
        <UsersTable users={users} />
      </div>
    </div>
  );
}
