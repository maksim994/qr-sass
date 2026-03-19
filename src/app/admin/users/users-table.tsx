"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";

const PLAN_IDS = ["FREE", "PRO", "BUSINESS"] as const;
const PLAN_LABELS: Record<string, string> = {
  FREE: "Бесплатный",
  PRO: "Про",
  BUSINESS: "Бизнес",
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: Date;
  _count: { qrCodes: number };
  memberships: Array<{
    workspace: {
      id: string;
      name: string;
      plan: string;
      subscription: { currentPeriodEnd: Date; status: string } | null;
    };
  }>;
};

type Props = { users: UserRow[] };

function toDateInputValue(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function UsersTable({ users }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function changePeriodEnd(workspaceId: string, dateStr: string) {
    setUpdating(workspaceId);
    try {
      const res = await fetchApi(`/api/admin/workspaces/${workspaceId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPeriodEnd: dateStr }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось изменить дату") || "Не удалось изменить дату");
    } finally {
      setUpdating(null);
    }
  }

  async function changePlan(workspaceId: string, plan: string) {
    setUpdating(workspaceId);
    try {
      const res = await fetchApi(`/api/admin/workspaces/${workspaceId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось изменить тариф") || "Не удалось изменить тариф");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="overflow-x-auto px-6 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 font-semibold text-slate-900">Email</th>
            <th className="py-3 font-semibold text-slate-900">Имя</th>
            <th className="py-3 font-semibold text-slate-900">Тариф</th>
            <th className="py-3 font-semibold text-slate-900">Оплачено до</th>
            <th className="py-3 font-semibold text-slate-900">Workspace</th>
            <th className="py-3 font-semibold text-slate-900">QR</th>
            <th className="py-3 font-semibold text-slate-900">Регистрация</th>
            <th className="py-3 font-semibold text-slate-900">Админ</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const workspace = u.memberships[0]?.workspace;
            const plan = workspace?.plan ?? "FREE";
            return (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-3">{u.email}</td>
                <td className="py-3">{u.name ?? "—"}</td>
                <td className="py-3">
                  {workspace ? (
                    <select
                      value={plan}
                      onChange={(e) => changePlan(workspace.id, e.target.value)}
                      disabled={updating === workspace.id}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      {PLAN_IDS.map((id) => (
                        <option key={id} value={id}>{PLAN_LABELS[id]}</option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3">
                  {workspace && (plan === "PRO" || plan === "BUSINESS") ? (
                    workspace.subscription ? (
                      <input
                        type="date"
                        defaultValue={toDateInputValue(workspace.subscription.currentPeriodEnd)}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v && v !== toDateInputValue(workspace.subscription!.currentPeriodEnd)) {
                            changePeriodEnd(workspace.id, v);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        disabled={updating === workspace.id}
                        className="rounded border border-slate-200 px-2 py-1 text-xs w-36"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">— нет подписки</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3">{workspace?.name ?? "—"}</td>
                <td className="py-3">{u._count.qrCodes}</td>
                <td className="py-3 text-slate-500">
                  {u.createdAt.toLocaleDateString("ru-RU")}
                </td>
                <td className="py-3">{u.isAdmin ? "✓" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
