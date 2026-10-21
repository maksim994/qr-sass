import { EMAIL_KIND_LABELS } from "@/lib/email-notification-policy";
import { emailHealth } from "@/lib/email-notifications";
import { smtpConfigured } from "@/lib/mail";
import { getDb } from "@/lib/db";
import { integrationKeyReady } from "@/lib/integration-secrets";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { SettingsClient, RetryNotification } from "./settings-client";
import { adminDate } from "@/lib/admin-list";
import { Button } from "@/components/ui";
import styles from "@/components/admin/admin.module.css";
export default async function NotificationsPage() {
  const db = getDb();
  const [config, jobs, worker] = await Promise.all([
    db.telegramSettings.findUnique({ where: { id: "default" } }),
    db.notificationOutbox.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventName: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        sentAt: true,
      },
    }),
    db.notificationWorkerState.findUnique({ where: { id: "default" } }),
  ]);
  const email = await emailHealth();
  const emailJobs = await db.emailOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      kind: true,
      status: true,
      attempts: true,
      errorCode: true,
      createdAt: true,
    },
  });
  const emailAlive =
    !!email.control?.lastSeenAt &&
    new Date().getTime() - email.control.lastSeenAt.getTime() < 60000;
  const alive =
    worker && new Date().getTime() - worker.lastSeenAt.getTime() < 60000;
  return (
    <>
      <AdminPageHeader
        title="Уведомления"
        description="События клиентов, оплаты и ежедневная сводка."
        action={
          <Button href="/admin/notifications" variant="secondary">
            Обновить статус
          </Button>
        }
      />
      <section className={styles.panel}>
        <h2 className={styles.title}>Email через Beget</h2>
        <p>
          {smtpConfigured() ? "SMTP настроен" : "SMTP не настроен"} ·{" "}
          {emailAlive ? "Обработчик работает" : "Обработчик не отвечает"}
        </p>
        <p>
          В очереди: {email.pending} · Ошибок: {email.failed} · Получатель
          сводок: maksim994@yandex.ru · Ежедневно в 09:00 МСК.
        </p>
        <p className={styles.note}>
          Статус «Отправлено» означает принятие письма SMTP-сервером. Он не
          подтверждает попадание во входящие. При потере ответа SMTP возможен
          повтор. Пароли, ссылки и содержимое писем в журнале не показываются.
        </p>
        <div className={styles.history}>
          {emailJobs.map((job) => (
            <article key={job.id}>
              <time>{adminDate(job.createdAt)} · МСК</time>
              <p>
                {EMAIL_KIND_LABELS[job.kind] ?? "Сервисное письмо"} ·{" "}
                {(
                  {
                    PENDING: "В очереди",
                    SENDING: "Отправляется",
                    SENT: "Отправлено",
                    FAILED: "Ошибка",
                    CANCELED: "Отменено",
                  } as Record<string, string>
                )[job.status] ?? job.status}{" "}
                · Попыток: {job.attempts}
                {job.errorCode ? ` · ${job.errorCode}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.title}>Подключение и события</h2>
          <SettingsClient
            initial={{
              enabled: config?.enabled ?? false,
              chatId: config?.chatId ?? "",
              events: config?.events ?? [
                "registration_completed",
                "trial_started",
                "payment_succeeded",
              ],
              dailyDigest: config?.dailyDigest ?? true,
              digestHour: config?.digestHour ?? 9,
              hasToken: !!config?.tokenCipher,
            }}
            keyReady={integrationKeyReady()}
          />
        </section>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2 className={styles.title}>Доставка</h2>
            <p>{alive ? "Обработчик работает" : "Обработчик не отвечает"}</p>
            <p className={styles.note}>
              Последний сигнал: {adminDate(worker?.lastSeenAt)} · Москва
            </p>
            <p className={styles.note}>
              «Отправлено» означает, что Telegram принял сообщение. При потере
              ответа возможен повтор. История показывает последние 30 сообщений.
            </p>
          </section>
          <section className={styles.panel}>
            <h2 className={styles.title}>Журнал отправки</h2>
            <div className={styles.history}>
              {jobs.map((job) => (
                <article key={job.id}>
                  <time>{adminDate(job.createdAt)} · МСК</time>
                  <p>
                    {(
                      {
                        registration_completed: "Регистрация",
                        trial_started: "Триал",
                        payment_succeeded: "Оплата",
                        admin_role: "Права",
                        digest: "Сводка",
                        test: "Тест",
                      } as Record<string, string>
                    )[job.eventName] ?? job.eventName}{" "}
                    ·{" "}
                    {
                      (
                        {
                          PENDING: "В очереди",
                          SENDING: "Отправляется",
                          SENT: "Отправлено",
                          FAILED: "Ошибка",
                          CANCELED: "Отменено",
                        } as Record<string, string>
                      )[job.status]
                    }
                  </p>
                  <p className={styles.note}>
                    Попыток: {job.attempts}
                    {job.lastError ? ` · ${job.lastError}` : ""}
                  </p>
                  {job.status === "FAILED" && <RetryNotification id={job.id} />}
                </article>
              ))}
              {!jobs.length && (
                <p className={styles.note}>
                  Сообщений пока нет. Сохраните подключение и отправьте тест.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
