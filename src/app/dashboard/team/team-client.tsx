"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

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
  planLabel: string;
};

export function TeamPageClient({ workspaceId, members, canInvite, isAdmin, planLabel }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function invite() {
    if (!email.trim() || !canInvite) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchApi(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Не удалось добавить участника");
        return;
      }
      setEmail("");
      setSuccess("Участник добавлен в команду");
      trackGoal(PRODUCT_GOALS.member_invited);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(userId: string) {
    if (!confirm("Исключить участника из команды?")) return;
    setRemoving(userId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchApi(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Не удалось исключить участника");
        return;
      }
      setSuccess("Участник исключён из команды");
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="qrs-team-page">
      {error ? (
        <Alert variant="danger" title="Ошибка" onClose={() => setError(null)} className="qrs-team-alert">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Готово" onClose={() => setSuccess(null)} className="qrs-team-alert">
          {success}
        </Alert>
      ) : null}

      {canInvite ? (
        <div className="qrs-wizard-card qrs-team-invite-card">
          <div style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
            Пригласить по email
          </div>
          <p style={{ marginTop: "6px", marginBottom: "18px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Пользователь должен быть уже зарегистрирован в qr-s.ru.
          </p>
          <div className="qrs-invite-row">
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
              className="qrs-team-input"
              disabled={loading}
            />
            <Button onClick={invite} disabled={loading || !email.trim()}>
              {loading ? "Добавление…" : "Добавить"}
            </Button>
          </div>
        </div>
      ) : !isAdmin ? (
        <Alert variant="info" className="qrs-team-alert">
          Управлять составом команды могут только владелец и администраторы. Тариф: {planLabel}.
        </Alert>
      ) : (
        <Alert variant="warning" className="qrs-team-alert">
          Достигнут лимит участников на тарифе {planLabel}.{" "}
          <a href="/dashboard/billing" className="qrs-navlink">
            Обновить тариф
          </a>
        </Alert>
      )}

      <div className="qrs-data-card qrs-team-table-card">
        {members.length === 0 ? (
          <p className="qrs-data-empty">Участников пока нет.</p>
        ) : (
          <div className="qrs-scroll qrs-data-table-wrap">
            <table className="qrs-data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  {isAdmin ? <th aria-label="Действия" /> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="qrs-team-email-cell">
                        {m.email}
                        {m.isCurrentUser ? <Badge variant="primary">Вы</Badge> : null}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-default)", fontWeight: "var(--fw-medium)" }}>{m.name ?? "—"}</td>
                    <td>
                      <Badge variant="primary">{m.roleLabel}</Badge>
                    </td>
                    {isAdmin ? (
                      <td style={{ textAlign: "right" }}>
                        {!m.isCurrentUser && m.role !== "OWNER" ? (
                          <button
                            type="button"
                            onClick={() => remove(m.userId)}
                            disabled={removing === m.userId}
                            className="qrs-data-action qrs-data-action--danger"
                          >
                            {removing === m.userId ? "…" : "Исключить"}
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
