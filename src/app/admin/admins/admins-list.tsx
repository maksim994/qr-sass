"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { Alert, Button, Field, Input, Modal } from "@/components/ui";
import { MSG } from "@/lib/user-messages";
import styles from "@/components/admin/admin.module.css";
type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
};
export function AdminsList({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter(),
    pending = useRef(false);
  const [selected, setSelected] = useState<User | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetchApi(`/api/admin/users/${selected.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !selected.isAdmin, reason }),
      });
      const parsed = await parseApiResponse(response);
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.ADMIN_CHANGE_FAILED);
        return;
      }
      setSelected(null);
      setNotice("Права обновлены. Изменение записано в журнал.");
      router.refresh();
    } catch {
      setError(MSG.ADMIN_CHANGE_FAILED);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {notice && <Alert variant="success">{notice}</Alert>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Права</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((user) => (
              <tr key={user.id}>
                <td data-label="Пользователь">
                  <Link href={`/admin/users/${user.id}`}>{user.email}</Link>
                  <small>{user.name}</small>
                </td>
                <td data-label="Права">
                  {user.isAdmin ? "Администратор" : "Пользователь"}
                </td>
                <td data-label="Действия">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelected(user);
                      setReason("");
                      setError("");
                      setNotice("");
                    }}
                  >
                    {user.isAdmin ? "Снять права" : "Назначить администратором"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!initialUsers.length && (
          <p className={styles.empty}>Пользователи не найдены.</p>
        )}
      </div>
      <Modal
        open={!!selected}
        onClose={() => {
          if (!pending.current) setSelected(null);
        }}
        closeDisabled={busy}
        title={
          selected?.isAdmin
            ? "Снять права администратора"
            : "Назначить администратора"
        }
        subtitle={selected?.email}
      >
        <form className={styles.form} onSubmit={submit}>
          <p className={styles.note}>
            {selected?.isAdmin
              ? "Пользователь потеряет доступ к управлению сервисом. Последнего администратора удалить из этой роли нельзя."
              : "Пользователь получит доступ ко всем клиентам, тарифам и настройкам сервиса."}
          </p>
          <Field label="Причина изменения">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={500}
              disabled={busy}
            />
          </Field>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Сохранение…" : "Подтвердить изменение"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
