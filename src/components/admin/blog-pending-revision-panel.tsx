import type { BlogPost, BlogPendingRevision } from "@prisma/client";
import { diffLines } from "diff";
import { AdminCard } from "@/components/admin/admin-page";
import { PendingRevisionActions } from "@/components/admin/blog-pending-revision-actions";
import { pendingArticleView } from "@/lib/blog-pending-revision";
import { articleSnapshot, changedArticleFields } from "@/lib/blog-versions";
import { blogFieldLabels } from "@/lib/blog-workflow-labels";
import { adminDate } from "@/lib/admin-list";
import { Alert } from "@/components/ui";
import styles from "./admin.module.css";
import workflow from "./blog-workflow.module.css";
const text = (value: unknown) => value == null ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
const markedLines = (value: string, marker: string) => value.replace(/\n$/, "").split("\n").map(line => `${marker} ${line}\n`).join("");
export function PendingRevisionPanel({ post, pending }: { post: BlogPost; pending: BlogPendingRevision }) {
  const before = articleSnapshot(post), after = articleSnapshot(pendingArticleView(post, pending));
  const changed = changedArticleFields(before, after).filter(key => !["renderedHtml", "contentUpdatedAt", "legacyHtml"].includes(key));
  const stale = post.updatedAt.getTime() !== pending.baseUpdatedAt.getTime() || !post.publishedAt;
  return <AdminCard><section id="pending-revision" className={styles.stack}>
    <h2 className={styles.title}>Есть черновик изменений</h2>
    <p className={styles.note}>{pending.actorName} · {adminDate(pending.updatedAt)} МСК. Живая версия остаётся на сайте до публикации.</p>
    {stale && <Alert variant="warning">Живая статья изменилась после создания черновика. Публикация заблокирована. Сохраните нужный текст, отмените черновик и подготовьте новый по актуальной версии.</Alert>}
    <details>
      <summary>Сравнить с живой версией</summary>
      <p><span className={workflow.removed}>− живая версия</span> · <span className={workflow.added}>+ черновик изменений</span></p>
      {changed.length ? changed.map(key => <details key={key} open={key === "content"}>
        <summary>{blogFieldLabels[key] ?? key}</summary>
        <pre className={workflow.diff}>{diffLines(text(before[key]), text(after[key])).map((part, i) => part.added ? <ins key={i} className={workflow.added}>{markedLines(part.value, "+")}</ins> : part.removed ? <del key={i} className={workflow.removed}>{markedLines(part.value, "−")}</del> : <span key={i}>{part.value}</span>)}</pre>
      </details>) : <p>Редакционные поля совпадают.</p>}
    </details>
    <PendingRevisionActions key={pending.updatedAt.toISOString()} postId={post.id} id={pending.id} updatedAt={pending.updatedAt.toISOString()} stale={stale} />
  </section></AdminCard>;
}
