"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { Alert, Button, Input } from "@/components/ui";
import { MSG } from "@/lib/user-messages";
import styles from "./admin.module.css";
export function PendingRevisionActions({ postId, id, updatedAt, stale }: { postId: string; id: string; updatedAt: string; stale: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const [path, setPath] = useState<string | null>(null);
  async function change(action: "preview" | "publish" | "cancel") {
    setBusy(action); setError("");
    try {
      const response = await fetchApi(`/api/admin/blog/${postId}/revision${action === "preview" ? "/preview" : ""}`, { method: action === "cancel" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, updatedAt }) });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? MSG.BLOG_PENDING_FAILED);
      if (action === "preview") setPath(json.data.path);
      else { setPath(null); router.refresh(); }
    } catch (err) { setError(err instanceof Error ? err.message : MSG.BLOG_PENDING_FAILED); }
    finally { setBusy(null); }
  }
  return <div className={styles.stack}>
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => change("preview")}>{busy === "preview" ? "Подготовка…" : "Предпросмотр черновика"}</Button>
      <Button type="button" disabled={busy !== null || stale} onClick={() => change("publish")}>{busy === "publish" ? "Публикация…" : "Опубликовать изменения"}</Button>
      <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => change("cancel")}>{busy === "cancel" ? "Отмена…" : "Отменить черновик"}</Button>
    </div>
    {path && <div className={styles.stack}><label htmlFor="pending-preview-url">Секретная ссылка показывает последнее сохранение черновика</label><Input id="pending-preview-url" readOnly value={`${window.location.origin}${path}`} onFocus={e => e.target.select()} /><a href={path} target="_blank" rel="noopener noreferrer">Открыть предпросмотр →</a></div>}
    {error && <Alert variant="danger">{error}</Alert>}
  </div>;
}
