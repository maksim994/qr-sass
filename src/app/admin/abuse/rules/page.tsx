import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import { AdminPageHeader } from '@/components/admin/admin-page';
import { RuleForm, DeleteRule } from '@/components/abuse/admin-controls';
import styles from '@/components/abuse/abuse.module.css';
export default async function RulesPage() {
  await requireAdmin(); const rules = await getDb().abuseRule.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
  return <div><AdminPageHeader title="Правила проверки ссылок" description="Доверенные домены обходят стоп-слова и сокращатели. Проверка репутации работает всегда." /><nav className={styles.tabs}><Link href="/admin/abuse">← Жалобы и модерация</Link></nav><RuleForm /><section className={styles.section}><h2>Действующие правила</h2><ul className={styles.list}>{rules.map(rule => <li className={styles.row} key={rule.id}><strong>{rule.value}</strong><p>{rule.kind} · {rule.action} · {rule.note}</p><DeleteRule id={rule.id} /></li>)}</ul>{!rules.length && <p>Правил пока нет. Добавьте домен или стоп-слово.</p>}</section></div>;
}
