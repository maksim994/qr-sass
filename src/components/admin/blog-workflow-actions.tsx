"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert, Button, Input } from "@/components/ui";
import { MSG } from "@/lib/user-messages";
import styles from "./admin.module.css";
export function PreviewLinkControl({ id, active }: { id: string; active: boolean }) {
  const [path, setPath] = useState<string | null>(null);
  const [hasLink, setHasLink] = useState(active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(revoke = false) {
    setBusy(true); setError("");
    try {
      const res = await fetchApi(`/api/admin/blog/${id}/preview-token`, { method: revoke ? "DELETE" : "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? MSG.BLOG_PREVIEW_LINK_FAILED);
      setPath(json.data.path); setHasLink(!revoke);
    } catch (err) { setError(err instanceof Error ? err.message : MSG.BLOG_PREVIEW_LINK_FAILED); }
    finally { setBusy(false); }
  }
  return <section className={styles.stack}>
    <h2 className={styles.title}>Секретная ссылка предпросмотра</h2>
    <p className={styles.note}>Показывает последнее сохранение. Каждый, у кого есть ссылка, сможет прочитать статью. Новая ссылка отключит предыдущую.</p>
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" disabled={busy} onClick={() => change()}>{busy ? "Подождите…" : hasLink ? "Перевыпустить ссылку" : "Создать ссылку"}</Button>
      {hasLink && <Button type="button" variant="secondary" disabled={busy} onClick={() => change(true)}>Отозвать ссылку</Button>}
    </div>
    {path && <div className={styles.stack}>
      <label htmlFor="article-preview-url">Скопируйте ссылку — после перезагрузки она скрывается</label>
      <Input id="article-preview-url" readOnly value={`${window.location.origin}${path}`} onFocus={e => e.target.select()} />
      <a href={path} target="_blank" rel="noopener noreferrer">Открыть предпросмотр →</a>
    </div>}
    <p role="status" className={styles.note}>{hasLink ? "Ссылка активна" : "Активных ссылок нет"}</p>
    {error && <Alert variant="danger">{error}</Alert>}
  </section>;
}
export function RestoreRevisionButton({ id, revisionId, expectedUpdatedAt }: { id: string; revisionId: string; expectedUpdatedAt: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function restore() {
    setBusy(true); setError("");
    try {
      const res = await fetchApi(`/api/admin/blog/${id}/restore`, { method: "POST", body: JSON.stringify({ revisionId, expectedUpdatedAt }), headers: { "Content-Type": "application/json" } });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? MSG.BLOG_RESTORE_FAILED);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : MSG.BLOG_RESTORE_FAILED); }
    finally { setBusy(false); }
  }
  return <div><Button type="button" size="sm" variant="secondary" disabled={busy} onClick={restore}>{busy ? "Восстановление…" : "Восстановить эту версию"}</Button>{error && <Alert variant="danger">{error}</Alert>}</div>;
}
