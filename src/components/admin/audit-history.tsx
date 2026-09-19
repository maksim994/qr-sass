import { getDb } from "@/lib/db";
import { adminDate } from "@/lib/admin-list";
import styles from "./admin.module.css";
export async function AuditHistory({ entityId }: { entityId: string }) {
  const events = await getDb().adminAuditLog.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>История изменений</h2>
      {events.length ? (
        <div className={styles.history}>
          {events.map((event) => (
            <article key={event.id}>
              <time>{adminDate(event.createdAt)} · МСК</time>
              <p>
                {event.action === "admin_role"
                  ? "Изменение прав"
                  : "Изменение доступа"}{" "}
                · {event.actorEmail}
              </p>
              <p>{event.reason}</p>
              <details>
                <summary>До и после</summary>
                <pre className={styles.snapshot}>
                  {JSON.stringify(
                    { до: event.before, после: event.after },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.note}>
          Изменений после включения журнала пока нет.
        </p>
      )}
    </section>
  );
}
