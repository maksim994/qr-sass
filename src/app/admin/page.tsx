import Link from "next/link";
import { getDb } from "@/lib/db";

export default async function AdminOverviewPage() {
  const db = getDb();
  const [userCount, workspaceCount, qrCount] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.qrCode.count({ where: { isArchived: false } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Администрирование</h1>
      <p className="mt-1 text-slate-600">Обзор системы</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/users" className="card p-6 transition hover:shadow-lg">
          <p className="text-3xl font-bold text-slate-900">{userCount}</p>
          <p className="mt-1 text-sm text-slate-500">Пользователей</p>
        </Link>
        <div className="card p-6">
          <p className="text-3xl font-bold text-slate-900">{workspaceCount}</p>
          <p className="mt-1 text-sm text-slate-500">Рабочих пространств</p>
        </div>
        <Link href="/admin/qr" className="card p-6 transition hover:shadow-lg">
          <p className="text-3xl font-bold text-slate-900">{qrCount}</p>
          <p className="mt-1 text-sm text-slate-500">QR-кодов</p>
        </Link>
      </div>
    </div>
  );
}
