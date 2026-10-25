'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, parseApiResponse } from '@/lib/client-api';
import { MSG } from '@/lib/user-messages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from './abuse.module.css';
function useMutation() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''); const router = useRouter();
  return { busy, error, async mutate(path: string, method: string, body?: object) {
    setBusy(true); setError('');
    try { const result = await parseApiResponse(await fetchApi(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })); if (!result.ok) { setError(result.error || MSG.UNEXPECTED_RESPONSE); return false; } router.refresh(); return true; }
    catch { setError(MSG.UNEXPECTED_RESPONSE); return false; } finally { setBusy(false); }
  } };
}
export function ModerationControls({ id }: { id: string }) {
  const { busy, error, mutate } = useMutation(); const [reason, setReason] = useState('phishing');
  return <div className={styles.form}><label className={styles.field}>Причина блокировки<select className="fk-input" value={reason} onChange={e => setReason(e.target.value)}><option value="phishing">Фишинг</option><option value="malware">Вредоносная ссылка</option><option value="illegal_goods">Запрещённые товары</option><option value="fraud">Мошенничество</option><option value="other">Другое</option></select></label>
    <div className={styles.actions}>{[['block', 'Заблокировать'], ['approve', 'Одобрить'], ['rollback', 'Откатить ссылку'], ['unblock', 'Разблокировать']].map(([action, label]) => <Button key={action} variant={action === 'block' ? 'danger' : 'secondary'} disabled={busy} onClick={() => mutate(`/api/admin/qr/${id}/moderation`, 'POST', { action, reason })}>{busy ? 'Подождите…' : label}</Button>)}</div>{error && <p role="alert">{error}</p>}</div>;
}
export function ReportControls({ id }: { id: string }) {
  const { busy, error, mutate } = useMutation();
  return <><div className={styles.actions}>{[['IN_REVIEW', 'Взять в работу'], ['RESOLVED_OK', 'Нарушения нет'], ['SPAM', 'Спам']].map(([status, label]) => <Button size="sm" variant="secondary" key={status} disabled={busy} onClick={() => mutate(`/api/admin/abuse/reports/${id}`, 'PATCH', { status })}>{label}</Button>)}</div>{error && <p role="alert">{error}</p>}</>;
}
export function RuleForm() {
  const { busy, error, mutate } = useMutation(); const [saved, setSaved] = useState(false);
  return <form className={styles.form} onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const data = Object.fromEntries(new FormData(form)); setSaved(false); if (await mutate('/api/admin/abuse/rules', 'POST', data)) { form.reset(); setSaved(true); } }}>
    <label className={styles.field}>Тип<select name="kind" className="fk-input"><option value="DOMAIN">Домен</option><option value="STOPWORD">Стоп-слово</option><option value="SHORTENER">Сокращатель ссылок</option><option value="ALLOW_DOMAIN">Доверенный домен</option></select></label>
    <label className={styles.field}>Домен или слово<Input name="value" required minLength={2} maxLength={253} /></label>
    <label className={styles.field}>Действие<select className="fk-input" name="action"><option value="REVIEW">Проверить вручную</option><option value="BLOCK">Опасный домен</option></select></label>
    <label className={styles.field}>Примечание<Input name="note" maxLength={500} /></label><Button type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить правило'}</Button>{error && <p role="alert">{error}</p>}{saved && <p role="status">Правило сохранено</p>}
  </form>;
}
export function DeleteRule({ id }: { id: string }) { const { busy, error, mutate } = useMutation(); return <><Button size="sm" variant="ghost" disabled={busy} onClick={() => mutate(`/api/admin/abuse/rules/${id}`, 'DELETE')}>Удалить правило</Button>{error && <p role="alert">{error}</p>}</>; }
