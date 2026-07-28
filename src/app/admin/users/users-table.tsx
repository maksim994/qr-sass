"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert, Badge, Input, Select } from "@/components/ui";

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
  const [error, setError] = useState<string | null>(null);

  async function changePeriodEnd(workspaceId: string, dateStr: string) {
    setUpdating(workspaceId);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Не удалось изменить дату");
    } finally {
      setUpdating(null);
    }
  }

  async function changePlan(workspaceId: string, plan: string) {
    setUpdating(workspaceId);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Не удалось изменить тариф");
    } finally {
      setUpdating(null);
    }
  }

  if (users.length === 0) {
    return <p className="qrs-data-empty">Пользователей пока нет.</p>;
  }

  return (
    <div>
      {error ? (
        <div style={{ padding: "16px 24px 0" }}>
          <Alert variant="danger" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      ) : null}
      <div className="qrs-scroll qrs-data-table-wrap">
        <table className="qrs-data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Тариф</th>
              <th>Оплачено до</th>
              <th>Workspace</th>
              <th>QR</th>
              <th>Регистрация</th>
              <th>Админ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const workspace = u.memberships[0]?.workspace;
              const plan = workspace?.plan ?? "FREE";
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td style={{ color: "var(--text-default)", fontWeight: "var(--fw-medium)" }}>{u.name ?? "—"}</td>
                  <td>
                    {workspace ? (
                      <Select
                        value={plan}
                        onChange={(e) => changePlan(workspace.id, e.target.value)}
                        disabled={updating === workspace.id}
                        className="fk-select__control--sm"
                        style={{ minWidth: 120 }}
                      >
                        {PLAN_IDS.map((id) => (
                          <option key={id} value={id}>
                            {PLAN_LABELS[id]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {workspace && (plan === "PRO" || plan === "BUSINESS") ? (
                      workspace.subscription ? (
                        <Input
                          type="date"
                          inputSize="sm"
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
                          style={{ width: 144 }}
                        />
                      ) : (
                        <span style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                          — нет подписки
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{workspace?.name ?? "—"}</td>
                  <td className="tnum">{u._count.qrCodes}</td>
                  <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>
                    {u.createdAt.toLocaleDateString("ru-RU")}
                  </td>
                  <td>
                    {u.isAdmin ? <Badge variant="success">✓</Badge> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
