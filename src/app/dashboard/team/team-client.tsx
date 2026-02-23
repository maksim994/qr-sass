"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  roleLabel: string;
  isCurrentUser: boolean;
};

type Props = {
  workspaceId: string;
  members: Member[];
  canInvite: boolean;
  isAdmin: boolean;
};

export function TeamPageClient({ workspaceId, members, canInvite, isAdmin }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function invite() {
    if (!email.trim() || !canInvite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as { error?: string })?.error ?? "Ошибка");
        return;
      }
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(userId: string) {
    if (!confirm("Исключить участника из команды?")) return;
    setRemoving(userId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as { error?: string })?.error ?? "Ошибка");
        return;
      }
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      {canInvite && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Пригласить по email</h2>
          <p className="mt-1 text-xs text-slate-500">Пользователь должен быть уже зарегистрирован в qr-s.ru.</p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
              className="input flex-1"
            />
            <button onClick={invite} disabled={loading} className="btn btn-primary">
              {loading ? "…" : "Добавить"}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 font-semibold text-slate-900">Email</th>
              <th className="px-5 py-3 font-semibold text-slate-900">Имя</th>
              <th className="px-5 py-3 font-semibold text-slate-900">Роль</th>
              {isAdmin && <th className="px-5 py-3 font-semibold text-slate-900" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="px-5 py-3">
                  <span className="font-medium text-slate-900">{m.email}</span>
                  {m.isCurrentUser && (
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">Вы</span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">{m.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="badge">{m.roleLabel}</span>
                </td>
                {isAdmin && (
                  <td className="px-5 py-3">
                    {!m.isCurrentUser && m.role !== "OWNER" && (
                      <button
                        onClick={() => remove(m.userId)}
                        disabled={removing === m.userId}
                        className="text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50"
                      >
                        {removing === m.userId ? "…" : "Исключить"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
