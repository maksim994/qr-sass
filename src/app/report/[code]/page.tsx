import { ReportForm } from '@/components/abuse/report-form';
import styles from '@/components/abuse/abuse.module.css';
export const metadata = { title: 'Пожаловаться на ссылку — QR-S', robots: { index: false, follow: false } };
export default async function ReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <main className={styles.wrap}><h1>Пожаловаться на ссылку</h1><p>Сообщите о подозрительном QR-коде. Жалобу рассмотрит администратор сервиса.</p><ReportForm code={code} /></main>;
}
