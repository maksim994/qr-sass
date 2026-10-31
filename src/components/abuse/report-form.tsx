'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchApi, parseApiResponse } from '@/lib/client-api';
import { MSG } from '@/lib/user-messages';
import styles from './abuse.module.css';
const reasons = [['phishing', 'Фишинг'], ['malware', 'Вредоносная ссылка'], ['illegal_goods', 'Запрещённые товары'], ['fraud', 'Мошенничество'], ['other', 'Другое']];
export function ReportForm({ code = '' }: { code?: string }) {
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
  if (sent) return <p role="status" className={styles.notice}>{MSG.ABUSE_REPORT_SENT}</p>;
  return <form className={styles.form} onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try {
      const response = await parseApiResponse(await fetchApi('/api/abuse/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: String(values.get('code')).trim(), reason: values.get('reason'), comment: values.get('comment'), email: values.get('email'), consent: values.get('consent') === 'on', website: values.get('website') }) }));
      if (!response.ok) { setError(response.error || MSG.UNEXPECTED_RESPONSE); return; }
      setSent(true);
    } catch { setError(MSG.UNEXPECTED_RESPONSE); } finally { setBusy(false); }
  }}>
    <label className={styles.field}>Короткий код<Input name="code" defaultValue={code} required maxLength={128} pattern="[a-zA-Z0-9_-]+" readOnly={Boolean(code)} aria-describedby="code-hint" /><small id="code-hint">Часть ссылки после /r/, /p/ или /v/.</small></label>
    <label className={styles.field}>Причина<select name="reason" className="fk-input" required>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className={styles.field}>Комментарий (необязательно)<textarea className="fk-input ym-disable-keys" name="comment" maxLength={2000} /><small>До 2000 символов. Не указывайте пароли и платёжные данные.</small></label>
    <label className={styles.field}>Email для ответа (необязательно)<Input name="email" type="email" autoComplete="email" maxLength={254} /></label>
    <label className={styles.check}><input type="checkbox" name="consent" /><span>Если я указал email, соглашаюсь на его обработку для рассмотрения жалобы по <Link href="/privacy-policy">политике конфиденциальности</Link>.</span></label>
    <label className={styles.honey} aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <Button disabled={busy} type="submit">{busy ? 'Отправляем…' : 'Отправить жалобу'}</Button>
  </form>;
}
