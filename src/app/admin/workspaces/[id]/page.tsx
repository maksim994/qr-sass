import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AccessForm } from "@/components/admin/access-form";
import { AuditHistory } from "@/components/admin/audit-history";
import { adminDate, workspacePlanLabel } from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = getDb();
  const workspace = await db.workspace.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      name: true,
      plan: true,
      accessMode: true,
      archivedPlan: true,
      createdAt: true,
      subscription: { select: { currentPeriodEnd: true, status: true } },
      memberships: {
        select: {
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
      _count: { select: { qrCodes: { where: { isArchived: false } } } },
    },
  });
  if (!workspace) notFound();
  return (
    <>
      <Link href="/admin/users" className={styles.back}>
        К клиентам
      </Link>
      <AdminPageHeader
        title={workspace.name}
        description="Доступ, команда и история кабинета."
      />
      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2 className={styles.title}>Доступ к сервису</h2>
            <dl className={styles.meta}>
              <dt>Тариф</dt>
              <dd>{workspacePlanLabel(workspace)}</dd>
              <dt>Срок · МСК</dt>
              <dd>{workspace.accessMode === "friends" ? "Бессрочно, без оплаты" : adminDate(workspace.subscription?.currentPeriodEnd)}</dd>
              <dt>Статус подписки</dt>
              <dd>
                {workspace.subscription
                  ? ({
                      active: "Активна",
                      past_due: "Просрочена",
                      canceled: "Отменена",
                    }[workspace.subscription.status] ??
                    workspace.subscription.status)
                  : "Нет подписки"}
              </dd>
              <dt>ID кабинета</dt>
              <dd>{workspace.id}</dd>
              <dt>Создан · МСК</dt>
              <dd>{adminDate(workspace.createdAt)}</dd>
            </dl>
            <div style={{ marginTop: 24 }}>
              <AccessForm
                workspaceId={workspace.id}
                name={workspace.name}
                plan={workspace.accessMode === "friends" ? "FRIENDS" : workspace.accessMode === "archive" ? "ARCHIVE" : workspace.plan}
                hasArchive={workspace.archivedPlan != null}
                periodEnd={
                  workspace.subscription?.currentPeriodEnd.toISOString() ?? null
                }
              />
            </div>
          </section>
          <section className={styles.panel}>
            <h2 className={styles.title}>
              Команда · {workspace.memberships.length}
            </h2>
            <div className={styles.history}>
              {workspace.memberships.map(({ user, role }) => (
                <article key={user.id}>
                  <Link
                    className={styles.link}
                    href={`/admin/users/${user.id}`}
                  >
                    {user.name || user.email}
                  </Link>
                  <p>
                    {user.email} ·{" "}
                    {
                      {
                        OWNER: "Владелец",
                        ADMIN: "Администратор кабинета",
                        MEMBER: "Участник",
                      }[role]
                    }
                  </p>
                </article>
              ))}
            </div>
          </section>
          <div className={styles.actions}>
            <Link
              className={styles.link}
              href={`/admin/qr?workspace=${workspace.id}`}
            >
              Активные QR: {workspace._count.qrCodes}
            </Link>
            <Link
              className={styles.link}
              href={`/admin/payments?workspace=${workspace.id}`}
            >
              Платежи кабинета
            </Link>
          </div>
        </div>
        <AuditHistory entityId={workspace.id} />
      </div>
    </>
  );
}
