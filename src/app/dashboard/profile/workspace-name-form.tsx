"use client";

import styles from "./profile.module.css";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input } from "@/components/ui";
import { Field } from "@/components/ui/field";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";

export function WorkspaceNameForm({ workspaceId, initialName }: { workspaceId: string; initialName: string }) {
  const id = useId();
  const pending = useRef(false);
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetchApi(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const result = await parseApiResponse<{ name: string }>(response);
      if (!result.ok) { setError(result.error ?? MSG.INTERNAL_ERROR); return; }
      setName(name.trim());
      setSavedName(name.trim());
      setSuccess(true);
      router.refresh();
    } catch {
      setError(MSG.INTERNAL_ERROR);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className={`${styles.panel} ${styles.workspace} space-y-4`}>
      <h2>Настройки кабинета</h2>
      <p className={styles.description}>Общее название для вас и участников команды.</p>
      <Field label="Название кабинета" htmlFor={id}>
        <Input id={id} value={name} onChange={(event) => { setName(event.target.value); setSuccess(false); }} required maxLength={120} disabled={loading} />
      </Field>
      <p className="text-sm qrs-text-muted">Можно указать своё имя или название компании. Участники команды увидят это название.</p>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{MSG.WORKSPACE_NAME_SAVED}</Alert> : null}
      <Button type="submit" disabled={loading || !name.trim() || name.trim() === savedName}>
        {loading ? "Сохранение…" : "Сохранить название"}
      </Button>
    </form>
  );
}
