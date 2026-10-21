"use client";
import styles from "./blog-merge-control.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Select } from "@/components/ui";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";

export function BlogMergeControl({ id, expectedUpdatedAt, targets }: { id: string; expectedUpdatedAt: string; targets: { id: string; slug: string; title: string }[] }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function merge(event: React.FormEvent) {
    event.preventDefault(); if (busy || !confirmed || !targetId) return;
    setBusy(true); setError("");
    try {
      const result = await parseApiResponse(await fetchApi(`/api/admin/blog/${id}/merge`, { method: "POST", body: JSON.stringify({ targetId, expectedUpdatedAt }) }));
      if (!result.ok) { setError(result.error || MSG.BLOG_MERGE_FAILED); return; }
      router.refresh();
    } catch { setError(MSG.BLOG_MERGE_FAILED); }
    finally { setBusy(false); }
  }
  return <form onSubmit={merge} className={styles.form}>
    <h2>Склеить с другой статьёй</h2>
    <p>Исходная статья снимется с публикации. Её адрес будет отдавать 301 на выбранную статью и уйдёт из sitemap и рекомендаций. Текст и файлы сохранятся. Редирект можно удалить в разделе «Редиректы».</p>
    <Field label="Целевая статья">
      <Select required value={targetId} onChange={event => { setTargetId(event.target.value); setConfirmed(false); }} disabled={busy}>
        <option value="">Выберите опубликованную статью</option>
        {targets.map(target => <option key={target.id} value={target.id}>{target.title} — /blog/{target.slug}</option>)}
      </Select>
    </Field>
    {targetId && <p>Переход на <a href={`/blog/${targets.find(target => target.id === targetId)?.slug}`} target="_blank" rel="noopener noreferrer">целевую статью ↗</a>.</p>}
    <label className={styles.confirmation}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} required />Я перенёс нужные текст и изображения в целевую статью и проверил её.</label>
    {error && <p role="alert">{error}</p>}
    <Button type="submit" variant="danger" disabled={busy || !confirmed || !targetId}>{busy ? "Склеиваем…" : "Склеить и включить 301"}</Button>
  </form>;
}
