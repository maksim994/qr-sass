"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { Button, Field, Input, Alert } from "@/components/ui";
import { MSG } from "@/lib/user-messages";
import styles from "./partners.module.css";

export function PartnerCreateForm() {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  return <form className={styles.form} onSubmit={async e => {
    e.preventDefault(); if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setSuccess(false);
    try {
      const response = await fetchApi("/api/admin/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, code }) });
      const parsed = await parseApiResponse(response);
      if (!parsed.ok) throw new Error(parsed.error || MSG.PARTNER_SAVE_FAILED);
      setName(""); setCode(""); setSuccess(true); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : MSG.PARTNER_SAVE_FAILED); }
    finally { busyRef.current = false; setBusy(false); }
  }}>
    <Field label="Имя партнёра" required><Input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Автор канала" disabled={busy} /></Field>
    <Field label="Код ссылки" hint="3–40 латинских букв, цифр, дефисов или подчёркиваний. Код нельзя изменить." required><Input value={code} onChange={e => setCode(e.target.value.toLowerCase())} required pattern="[a-z0-9][a-z0-9_-]{2,39}" minLength={3} maxLength={40} placeholder="partner-name" disabled={busy} /></Field>
    <Button type="submit" disabled={busy}>{busy ? "Создаём…" : "Добавить партнёра"}</Button>
    {error && <Alert variant="danger">{error}</Alert>}
    {success && <p role="status">Партнёр добавлен. Ссылка появилась в таблице ниже.</p>}
  </form>;
}

export function PartnerActions({ id, enabled, url }: { id: string; enabled: boolean; url: string }) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <div className={styles.actions}>
    <Button variant="secondary" size="sm" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setMessage("Ссылка скопирована"); }
      catch { setMessage(MSG.COPY_FAILED); }
    }}>Копировать</Button>
    <Button variant="secondary" size="sm" disabled={busy} onClick={async () => {
      if (busyRef.current) return;
      busyRef.current = true; setBusy(true); setMessage("");
      try {
        const response = await fetchApi("/api/admin/partners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, enabled: !enabled }) });
        const parsed = await parseApiResponse(response);
        if (!parsed.ok) throw new Error(parsed.error || MSG.PARTNER_SAVE_FAILED);
        router.refresh();
      } catch (e) { setMessage(e instanceof Error ? e.message : MSG.PARTNER_SAVE_FAILED); }
      finally { busyRef.current = false; setBusy(false); }
    }}>{busy ? "Сохраняем…" : enabled ? "Приостановить" : "Включить"}</Button>
    {message && <span role="status">{message}</span>}
  </div>;
}
