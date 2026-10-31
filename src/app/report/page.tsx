import { ReportForm } from '@/components/abuse/report-form';
import styles from '@/components/abuse/abuse.module.css';
export const metadata = { title: 'Пожаловаться на ссылку — QR-S', robots: { index: false, follow: false } };
export default function ReportPage() { return <main className={styles.wrap}><h1>Пожаловаться на ссылку</h1><p>Укажите короткий код из ссылки QR-S. Также можно написать на <a href="mailto:abuse@qr-s.ru">abuse@qr-s.ru</a>.</p><ReportForm /></main>; }
