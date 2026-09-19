import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AuditHistory } from "@/components/admin/audit-history";
import { adminDate, workspacePlanLabel } from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getDb().user.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true, plan: true, accessMode: true } },
        },
      },
    },
  });
  if (!user) notFound();
  return (
    <>
      <Link className={styles.back} href="/admin/users">
        К клиентам
      </Link>
      <AdminPageHeader
        title={user.name || user.email}
        description={user.email}
      />
      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2 className={styles.title}>Пользователь</h2>
            <dl className={styles.meta}>
              <dt>ID</dt>
              <dd>{user.id}</dd>
              <dt>Регистрация · МСК</dt>
              <dd>{adminDate(user.createdAt)}</dd>
              <dt>Права</dt>
              <dd>{user.isAdmin ? "Администратор" : "Пользователь"}</dd>
            </dl>
          </section>
          <section className={styles.panel}>
            <h2 className={styles.title}>
              Кабинеты · {user.memberships.length}
            </h2>
            <div className={styles.history}>
              {user.memberships.map(({ workspace, role }) => (
                <article key={workspace.id}>
                  <Link
                    className={styles.link}
                    href={`/admin/workspaces/${workspace.id}`}
                  >
                    {workspace.name}
                  </Link>
                  <p>
                    {workspacePlanLabel(workspace)} ·{" "}
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
              {!user.memberships.length && <p>Кабинетов пока нет.</p>}
            </div>
          </section>
        </div>
        <AuditHistory entityId={user.id} />
      </div>
    </>
  );
}
