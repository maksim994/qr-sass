import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPagination } from "@/components/admin/admin-list";
import { adminDate, listParams, type AdminSearchParams } from "@/lib/admin-list";
import { blogEventLabels, blogFieldLabels } from "@/lib/blog-workflow-labels";
import { Button, Input, Select } from "@/components/ui";
import styles from "@/components/admin/admin.module.css";
import workflow from "@/components/admin/blog-workflow.module.css";
export default async function BlogHistoryPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const params = await searchParams, { size, page: requested } = listParams(params);
  const param = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const postId = param("article"), actor = param("actor"), type = param("type");
  const where: Prisma.BlogEventWhereInput = { ...(postId ? { postId } : {}), ...(actor ? { actorName: { contains: actor, mode: "insensitive" } } : {}), ...(type ? { type } : {}) };
  const db = getDb(), total = await db.blogEvent.count({ where });
  const page = Math.min(requested, Math.max(1, Math.ceil(total / size)));
  const [events, posts] = await Promise.all([
    db.blogEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * size, take: size }),
    db.blogEvent.findMany({ distinct: ["postId"], select: { postId: true, postTitle: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return <div className={styles.stack}>
    <AdminPageHeader title="Журнал статей" description="Кто, когда и что изменил. Время указано по Москве." action={<Button href="/admin/blog" variant="secondary" size="sm">К статьям</Button>} />
    <form method="get" className={workflow.compareForm}>
      <label htmlFor="history-article">Статья<Select id="history-article" name="article" defaultValue={postId}><option value="">Все статьи</option>{posts.map(p => <option key={p.postId} value={p.postId}>{p.postTitle}</option>)}</Select></label>
      <label htmlFor="history-actor">Автор<Input id="history-actor" name="actor" defaultValue={actor} placeholder="Имя или email" /></label>
      <label htmlFor="history-type">Действие<Select id="history-type" name="type" defaultValue={type}><option value="">Все действия</option>{Object.entries(blogEventLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label>
      <Button type="submit">Применить</Button><Link href="/admin/blog/history">Сбросить</Link>
    </form>
    <div className={styles.tableWrap}>{events.length ? <table className={styles.table}>
      <thead><tr><th>Дата · МСК</th><th>Кто</th><th>Статья и действие</th><th>Изменённые поля</th></tr></thead>
      <tbody>{events.map(event => <tr key={event.id}>
        <td data-label="Дата · МСК">{adminDate(event.createdAt)}</td>
        <td data-label="Кто">{event.actorName}<br />{event.source}</td>
        <td data-label="Статья и действие">{blogEventLabels[event.type] ?? event.type}<br />{event.type === "delete" ? event.postTitle : <Link href={`/admin/blog/${event.postId}/versions`}>{event.postTitle}</Link>}</td>
        <td data-label="Изменённые поля">{event.fields.filter(f => f !== "renderedHtml").map(f => blogFieldLabels[f] ?? f).join(", ") || "—"}{event.comment && <p>{event.comment}</p>}</td>
      </tr>)}</tbody>
    </table> : <p className={styles.empty}>Записей пока нет или они не соответствуют фильтрам.</p>}</div>
    <AdminPagination total={total} page={page} size={size} params={params} />
  </div>;
}
