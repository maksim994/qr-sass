"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; email: string; name: string | null; isAdmin: boolean };

type Props = { initialUsers: User[] };

export function AdminsList({ initialUsers }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function toggleAdmin(user: User) {
    setUpdating(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось изменить") || "Не удалось изменить");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 font-semibold text-slate-900">Email</th>
            <th className="py-3 font-semibold text-slate-900">Имя</th>
            <th className="py-3 font-semibold text-slate-900">Статус</th>
            <th className="py-3 font-semibold text-slate-900">Действие</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-3">{u.email}</td>
              <td className="py-3">{u.name ?? "—"}</td>
              <td className="py-3">
                {u.isAdmin ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Администратор
                  </span>
                ) : (
                  <span className="text-slate-400">Пользователь</span>
                )}
              </td>
              <td className="py-3">
                <button
                  onClick={() => toggleAdmin(u)}
                  disabled={updating === u.id}
                  className={`text-sm font-medium ${u.isAdmin ? "text-amber-600 hover:text-amber-700" : "text-blue-600 hover:text-blue-700"}`}
                >
                  {updating === u.id ? "…" : u.isAdmin ? "Снять права" : "Назначить админом"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
