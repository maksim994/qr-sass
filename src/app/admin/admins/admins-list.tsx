"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert, Badge } from "@/components/ui";

type User = { id: string; email: string; name: string | null; isAdmin: boolean };

type Props = { initialUsers: User[] };

export function AdminsList({ initialUsers }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAdmin(user: User) {
    setUpdating(user.id);
    setError(null);
    try {
      const res = await fetchApi(`/api/admin/users/${user.id}/admin`, {
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
      setError(e instanceof Error ? e.message : "Не удалось изменить");
    } finally {
      setUpdating(null);
    }
  }

  if (initialUsers.length === 0) {
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
              <th>Статус</th>
              <th aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td style={{ color: "var(--text-default)", fontWeight: "var(--fw-medium)" }}>{u.name ?? "—"}</td>
                <td>
                  {u.isAdmin ? (
                    <Badge variant="success">Администратор</Badge>
                  ) : (
                    <Badge variant="info">Пользователь</Badge>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={() => toggleAdmin(u)}
                    disabled={updating === u.id}
                    className={`qrs-data-action${u.isAdmin ? " qrs-data-action--danger" : ""}`}
                    style={u.isAdmin ? undefined : { color: "var(--color-primary)" }}
                  >
                    {updating === u.id ? "…" : u.isAdmin ? "Снять права" : "Назначить админом"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
