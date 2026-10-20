import Link from "next/link";
import { notFound } from "next/navigation";
import { diffLines } from "diff";
import { getDb } from "@/lib/db";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";
import { RestoreRevisionButton } from "@/components/admin/blog-workflow-actions";
import { AdminPagination } from "@/components/admin/admin-list";
import { adminDate, listParams, type AdminSearchParams } from "@/lib/admin-list";
import { blogFieldLabels } from "@/lib/blog-workflow-labels";
import styles from "@/components/admin/admin.module.css";
import workflow from "@/components/admin/blog-workflow.module.css";
import { Button, Select } from "@/components/ui";
const text = (value: unknown) => value == null ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
export default async function VersionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<AdminSearchParams> }) {
  const { id } = await params, query = await searchParams;
  const db = getDb(), { size, page: requested } = listParams(query);
  const post = await db.blogPost.findUnique({ where: { id }, select: { title: true, updatedAt: true } });
  if (!post) notFound();
  const total = await db.blogRevision.count({ where: { postId: id } });
  const page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const revisions = await db.blogRevision.findMany({ where: { postId: id }, orderBy: { number: "desc" }, take: size, skip: (page - 1) * size, omit: { snapshot: true } });
  const ids = [typeof query.from === "string" ? query.from : (revisions[1]?.id ?? revisions[0]?.id), typeof query.to === "string" ? query.to : revisions[0]?.id].filter((v): v is string => !!v);
  const selected = await db.blogRevision.findMany({ where: { postId: id, id: { in: ids } } });
  const from = selected.find(v => v.id === ids[0]), to = selected.find(v => v.id === ids[1]);
  const options = [...revisions, ...selected.filter(v => !revisions.some(r => r.id === v.id))];
  const a = (from?.snapshot ?? {}) as Record<string, unknown>, b = (to?.snapshot ?? {}) as Record<string, unknown>;
  const changed = Object.keys(b).filter(key => key !== "renderedHtml" && JSON.stringify(a[key]) !== JSON.stringify(b[key]));
  return <div className={styles.stack}>
    <AdminPageHeader title="Версии статьи" description={post.title} action={<Button href={`/admin/blog/${id}/edit`} variant="secondary" size="sm">К редактированию</Button>} />
    <p className={styles.note}>Каждое сохранение создаёт версию. Восстановление добавляет новую запись и сразу меняет статью и её статус. Счётчики и закреплённый публичный адрес сохраняются.</p>
    {revisions.length ? <>
      <AdminCard><h2 className={styles.title}>Сравнение версий</h2>
        <form method="get" className={workflow.compareForm}>
          <input type="hidden" name="page" value={page} />
          <label htmlFor="version-from">До<Select id="version-from" name="from" defaultValue={from?.id}>{options.map(v => <option key={v.id} value={v.id}>№{v.number} · {adminDate(v.createdAt)}</option>)}</Select></label>
          <label htmlFor="version-to">После<Select id="version-to" name="to" defaultValue={to?.id}>{options.map(v => <option key={v.id} value={v.id}>№{v.number} · {adminDate(v.createdAt)}</option>)}</Select></label>
          <Button type="submit">Сравнить</Button>
        </form>
        {from && to && <div className={styles.stack}>
          <p>№{from.number} → №{to.number} · <span className={workflow.removed}>− удалено</span> · <span className={workflow.added}>+ добавлено</span></p>
          {changed.length ? changed.map(key => <details key={key} open={key === "content"}>
            <summary>{blogFieldLabels[key] ?? key}</summary>
            <pre className={workflow.diff}>{diffLines(text(a[key]), text(b[key])).map((part, i) => part.added ? <ins key={i} className={workflow.added}>{part.value.endsWith("\n") ? part.value : `${part.value}\n`}</ins> : part.removed ? <del key={i} className={workflow.removed}>{part.value.endsWith("\n") ? part.value : `${part.value}\n`}</del> : <span key={i}>{part.value}</span>)}</pre>
          </details>) : <p>Редакционные поля совпадают.</p>}
        </div>}
      </AdminCard>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Версия · МСК</th><th>Кто и откуда</th><th>Комментарий</th><th>Восстановление</th></tr></thead>
        <tbody>{revisions.map(v => <tr key={v.id}>
          <td data-label="Версия · МСК">№{v.number}<br />{adminDate(v.createdAt)}</td>
          <td data-label="Кто и откуда">{v.actorName}<br />{v.source}</td>
          <td data-label="Комментарий">{v.comment || "—"}<br /><Link href={`?from=${v.id}&to=${revisions[0].id}&page=${page}`}>Сравнить с верхней версией</Link></td>
          <td data-label="Восстановление"><RestoreRevisionButton id={id} revisionId={v.id} expectedUpdatedAt={post.updatedAt.toISOString()} /></td>
        </tr>)}</tbody>
      </table></div>
      <AdminPagination total={total} page={page} size={size} params={query} />
    </> : <AdminCard><p>История начнётся с первого сохранения. Текущее состояние старой статьи будет сохранено как исходная версия.</p></AdminCard>}
  </div>;
}
