import Link from 'next/link';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminPageHeader, AdminDataCard } from '@/components/admin/admin-page';
import { ModerationControls, ReportControls } from '@/components/abuse/admin-controls';
import styles from '@/components/abuse/abuse.module.css';
import type { AbuseReportStatus } from '@prisma/client';
export default async function AdminAbusePage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams, tab = sp.tab ?? 'reports';
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1)), take = 30;
  const statuses: AbuseReportStatus[] = ['NEW', 'IN_REVIEW', 'RESOLVED_BLOCKED', 'RESOLVED_OK', 'SPAM'];
  const status = statuses.includes(sp.status as AbuseReportStatus) ? sp.status as AbuseReportStatus : undefined;
  const db = getDb();
  const reports = tab === 'reports' ? await db.abuseReport.findMany({ where: { status }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * take, take }) : [];
  const qrs = tab !== 'reports' ? await db.qrCode.findMany({ where: tab === 'blocked' ? { moderationStatus: 'BLOCKED' } : { OR: [{ moderationStatus: { in: ['ON_MODERATION', 'PENDING_CHECK'] } }, { moderationAttention: true }] }, orderBy: [{ moderationAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * take, take }) : [];
  return <div><AdminPageHeader title="Защита от злоупотреблений" description="Жалобы на ссылки, ручная модерация и правила проверки." />
    <nav aria-label="Разделы защиты" className={styles.tabs}>{[['reports', 'Жалобы'], ['review', 'На модерации'], ['blocked', 'Заблокированные']].map(([key, label]) => <Link aria-current={tab === key ? 'page' : undefined} href={`/admin/abuse?tab=${key}`} key={key}>{label}</Link>)}<Link href="/admin/abuse/rules">Правила</Link></nav>
    {tab === 'reports' && <form className={styles.actions}><input type="hidden" name="tab" value="reports" /><label>Статус <select name="status" defaultValue={status ?? ''} className="fk-input"><option value="">Все</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button className="fk-button fk-button--secondary">Показать</button></form>}
    <section className={styles.section}><AdminDataCard><ul className={styles.list}>{reports.map(report => <li className={styles.row} key={report.id}><strong>{report.reason} · {report.status}</strong><p>{report.createdAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} · {report.shortCode}</p><p>{report.comment || 'Без комментария'}</p>{report.qrCodeId && <p><Link href={`/admin/qr/${report.qrCodeId}`}>Карточка кода и блокировка</Link></p>}<ReportControls id={report.id} /></li>)}{qrs.map(qr => <li className={styles.row} key={qr.id}><Link href={`/admin/qr/${qr.id}`}><strong>{qr.name}</strong></Link><p>{qr.moderationStatus} · {qr.shortCode} · {qr.moderationReason || 'Причина не указана'}</p>{qr.moderationAttention && <p>Требует внимания. Переход по старому коду сохранён.</p>}<ModerationControls id={qr.id} /></li>)}</ul>{!reports.length && !qrs.length && <p>В этом списке пока нет записей.</p>}</AdminDataCard></section>
    <nav className={styles.tabs} aria-label="Страницы">{page > 1 && <Link href={`/admin/abuse?tab=${tab}&status=${status ?? ''}&page=${page - 1}`}>← Назад</Link>}{(reports.length || qrs.length) === take && <Link href={`/admin/abuse?tab=${tab}&status=${status ?? ''}&page=${page + 1}`}>Далее →</Link>}</nav>
  </div>;
}
