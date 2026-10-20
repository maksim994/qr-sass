"use client";
// Operate: extend the incumbent Manrope/fk admin surface. Name → create → one-time
// masked secret → token list/revoke. Success: usable at 360px, no secret in SSR or URLs.
import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { fetchApi } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
import styles from "./admin.module.css";
import css from "./blog-token-control.module.css";
type Token = { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Ещё не использовался";
export function BlogTokenControl({ initialTokens }: { initialTokens: Token[] }) {
  const [tokens, setTokens] = useState(initialTokens), [name, setName] = useState("");
  const [secret, setSecret] = useState(""), [visible, setVisible] = useState(false);
  const [secretId, setSecretId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetchApi("/api/admin/blog/tokens", { method: "POST", body: JSON.stringify({ name }) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || MSG.BLOG_API_TOKEN_FAILED);
      const { token, ...row } = result.data;
      setSecret(token); setSecretId(row.id); setVisible(false); setTokens(current => [row, ...current]); setName("");
    } catch (e) { setError(e instanceof Error ? e.message : MSG.BLOG_API_TOKEN_FAILED); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetchApi(`/api/admin/blog/tokens/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || MSG.BLOG_API_TOKEN_FAILED);
      setTokens(current => current.map(t => t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t));
      if (secretId === id) { setSecret(""); setSecretId(null); setVisible(false); }
      setConfirm(null); setNotice("Ключ отозван. Новые запросы с ним возвращают 401.");
    } catch (e) { setError(e instanceof Error ? e.message : MSG.BLOG_API_TOKEN_FAILED); }
    finally { setBusy(false); }
  }
  return <div className={css.stack}>
    <p className={css.description}>Лимит каждого ключа — 60 запросов в минуту. Все изменения записываются в историю с именем ключа. <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer">Схема OpenAPI ↗</a></p>
    <form onSubmit={create} className={css.create}>
      <label htmlFor="blog-token-name">Имя ключа<Input id="blog-token-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} required placeholder="Например, Grok Bot контент" disabled={busy || !!secret} /></label>
      <Button type="submit" disabled={busy || !!secret || !name.trim()}>{busy ? "Сохраняем…" : "Создать ключ"}</Button>
    </form>
    {error && <p role="alert" className={css.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {secret && <section className={css.secret} aria-labelledby="new-key-title">
      <h2 id="new-key-title">Сохраните ключ сейчас</h2>
      <p>Он показан только в этой форме. После закрытия или обновления страницы восстановить его нельзя. Передайте его боту через защищённое поле секретов.</p>
      <label htmlFor="blog-token-secret">Новый API-ключ<Input id="blog-token-secret" className="ym-disable-keys" type={visible ? "text" : "password"} value={secret} readOnly autoComplete="off" spellCheck={false} /></label>
      <div className={css.actions}>
        <Button type="button" variant="secondary" onClick={() => setVisible(v => !v)}>{visible ? "Скрыть ключ" : "Показать ключ"}</Button>
        <Button type="button" onClick={async () => { try { await navigator.clipboard.writeText(secret); setNotice("Ключ скопирован."); } catch { setError(MSG.BLOG_API_COPY_FAILED); } }}>Скопировать ключ</Button>
        <Button type="button" variant="ghost" onClick={() => { setSecret(""); setSecretId(null); setVisible(false); setNotice("Форма закрыта. Ключ остаётся действующим."); }}>Я сохранил ключ</Button>
      </div>
    </section>}
    <div className={styles.tableWrap}>{tokens.length ? <table className={styles.table}>
      <thead><tr><th>Ключ</th><th>Создан · МСК</th><th>Использован · МСК</th><th>Доступ</th></tr></thead>
      <tbody>{tokens.map(t => <tr key={t.id}>
        <td data-label="Ключ"><strong>{t.name}</strong><br /><code>{t.keyPrefix}…</code></td>
        <td data-label="Создан · МСК">{date(t.createdAt)}</td>
        <td data-label="Использован · МСК">{date(t.lastUsedAt)}</td>
        <td data-label="Доступ">{t.revokedAt ? <>Отозван<br />{date(t.revokedAt)}</> : confirm === t.id ? <div className={css.actions}><span>Бот потеряет доступ сразу.</span><Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => revoke(t.id)}>Подтвердить отзыв</Button><Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(null)}>Отмена</Button></div> : <div className={css.actions}><span>Действует</span><Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setConfirm(t.id)}>Отозвать</Button></div>}</td>
      </tr>)}</tbody>
    </table> : <p className={styles.empty}>Ключей пока нет. Создайте отдельный ключ для каждого бота или интеграции.</p>}</div>
    <p><Link href="/admin/blog/history?type=token_create">История создания ключей</Link> · <Link href="/admin/blog/history?type=token_revoke">История отзывов</Link></p>
  </div>;
}
