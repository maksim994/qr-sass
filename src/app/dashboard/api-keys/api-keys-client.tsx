"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { Alert, Modal } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { MSG } from "@/lib/user-messages";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import styles from "./api-keys.module.css";

export function ApiKeysUpgradeBanner() {
  return <section className={styles.panel}><h2>Подключите свои приложения</h2><p className={styles.hint}>Создание и управление QR-кодами через API доступны на тарифе Бизнес.</p><Link href="/dashboard/billing" className="fk-button fk-button--primary">Посмотреть тарифы</Link></section>;
}
export function ApiKeysPermissionBanner() {
  return <Alert variant="info" title="Управление ключами недоступно">Создавать и отзывать ключи могут владелец и администраторы кабинета.</Alert>;
}
export function ApiKeysWorkspaceBar({ workspaceId }: { workspaceId: string }) {
  return <section className={styles.workspace}><div><h2>Идентификатор кабинета</h2><p>Передавайте его в поле <code>workspaceId</code> при запросах к API.</p><code className={styles.code}>{workspaceId}</code></div><CopyButton value={workspaceId} label="Скопировать ID" /></section>;
}

type KeyItem = { id: string; name: string; prefix: string; createdAt: string };
export function ApiKeysClient({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<{key: string; name: string} | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<KeyItem | null>(null);
  const [error, setError] = useState("");
  const [revokeError, setRevokeError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const endpoint = `/api/workspaces/${workspaceId}/api-keys`;
  useEffect(() => { if (error || newKey || notice) feedback.current?.focus(); }, [error, newKey, notice]);

  const loadKeys = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError("");
    try {
      const result = await parseApiResponse<{items: KeyItem[]}>(await fetchApi(endpoint, {signal}));
      if (signal?.aborted) return;
      if (!result.ok || !Array.isArray(result.data?.items)) { setLoadError(result.error ?? MSG.API_KEYS_LOAD_FAILED); return; }
      setKeys(result.data.items);
    } catch { if (!signal?.aborted) setLoadError(MSG.API_KEYS_LOAD_FAILED); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController();
    void loadKeys(controller.signal);
    return () => controller.abort();
  }, [loadKeys]);

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || newKey || !name.trim()) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await parseApiResponse<{key: string; name: string}>(await fetchApi(endpoint, {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name.trim()}),
      }));
      if (!result.ok || !result.data?.key) { setError(result.error ?? MSG.API_KEY_CREATE_FAILED); return; }
      setNewKey({key: result.data.key, name: result.data.name}); setName("");
      trackGoal(PRODUCT_GOALS.api_key_created);
      await loadKeys();
    } catch { setError(MSG.API_KEY_CREATE_FAILED); }
    finally { pending.current = false; setBusy(false); }
  }
  async function revokeKey() {
    if (pending.current || !selected) return;
    pending.current = true; setBusy(true); setRevokeError("");
    try {
      const result = await parseApiResponse(await fetchApi(`${endpoint}/${selected.id}`, {method: "DELETE"}));
      if (!result.ok) { setRevokeError(result.error ?? MSG.API_KEY_REVOKE_FAILED); return; }
      setKeys(current => current.filter(key => key.id !== selected.id));
      if (newKey?.name === selected.name) setNewKey(null);
      setNotice(`Ключ «${selected.name}» отозван.`); setSelected(null);
    } catch { setRevokeError(MSG.API_KEY_REVOKE_FAILED); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className={styles.flow}>
    {(error || notice || newKey) && <div ref={feedback} tabIndex={-1} className={styles.feedback}>
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {newKey && <section className={styles.panel}><h2>Сохраните ключ «{newKey.name}»</h2><p className={styles.hint}>Полный ключ показан только сейчас. Сохраните его перед закрытием страницы. Не размещайте ключ в открытом коде сайта.</p><code className={styles.secret}>{newKey.key}</code><div className={styles.actions}><CopyButton value={newKey.key} label="Скопировать ключ" /><button type="button" className="fk-button fk-button--ghost" disabled={busy} onClick={() => { setNewKey(null); nameRef.current?.focus(); }}>Я сохранил ключ</button></div></section>}
    </div>}
    <section className={styles.panel}><h2>Создать ключ</h2><p className={styles.hint}>Отдельный ключ для каждого подключения поможет управлять доступом.</p><form onSubmit={createKey} className={styles.form}><div><label htmlFor="api-key-name">Название подключения</label><input ref={nameRef} id="api-key-name" className="fk-input" placeholder="Например, CRM или интернет-магазин" value={name} onChange={event => setName(event.target.value)} maxLength={64} required disabled={busy || !!newKey} /></div><button type="submit" className="fk-button fk-button--primary" disabled={busy || !!newKey || !name.trim()}>{busy && !selected ? "Создаём ключ…" : "Создать ключ"}</button></form>{newKey && <p className={styles.hint}>Сначала сохраните созданный ключ.</p>}</section>
    <section className={styles.panel}><h2>Ключи кабинета{!loading && !loadError ? ` · ${keys.length}` : ""}</h2>
      {loading ? <p className={styles.hint} role="status">Загружаем ключи…</p> : loadError ? <div className={styles.loadError}><Alert variant="danger">{loadError}</Alert><button type="button" className="fk-button fk-button--secondary" onClick={() => void loadKeys()}>Повторить загрузку</button></div> : !keys.length ? <p className={styles.hint}>Ключей пока нет. Создайте первый для подключения своего приложения.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Подключение</th><th scope="col">Префикс ключа</th><th scope="col">Создан</th><th scope="col"><span className="sr-only">Действия</span></th></tr></thead><tbody>{keys.map(key => <tr key={key.id}><td>{key.name}</td><td data-label="Префикс"><code>{key.prefix}</code></td><td data-label="Создан"><time dateTime={key.createdAt}>{new Date(key.createdAt).toLocaleDateString("ru-RU", {day:"numeric", month:"short", year:"numeric", timeZone:"Europe/Moscow"})}</time></td><td><button type="button" className={styles.revoke} disabled={busy} aria-label={`Отозвать ключ ${key.name}`} onClick={() => { setSelected(key); setRevokeError(""); }}>Отозвать</button></td></tr>)}</tbody></table></div>}
    </section>
    <Modal open={!!selected} onClose={() => { if (!pending.current) setSelected(null); }} closeDisabled={busy} title="Отозвать API-ключ?" size="sm" footer={<><button type="button" className="fk-button fk-button--secondary" disabled={busy} onClick={() => setSelected(null)}>Отмена</button><button type="button" className="fk-button fk-button--danger" disabled={busy} onClick={() => void revokeKey()}>{busy ? "Отзываем…" : "Отозвать ключ"}</button></>}><p className={styles.dialogText}>Подключение «{selected?.name}» потеряет доступ к API. Для восстановления понадобится создать новый ключ и обновить его в приложении.</p>{revokeError && <Alert variant="danger">{revokeError}</Alert>}</Modal>
  </div>;
}
