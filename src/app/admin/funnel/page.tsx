import {
  AdminPageHeader,
  AdminCard,
  AdminDataCard,
} from "@/components/admin/admin-page";
import { Alert } from "@/components/ui";
import styles from "./funnel.module.css";
import { buildFunnelReport } from "@/lib/funnel";

export default async function AdminFunnelPage() {
  const report = await buildFunnelReport();

  return (
    <div>
      <AdminPageHeader
        title="Воронка"
        description={`Серверные события за ${report.windowDays} дней. Клик виджета оплаты не считается оплатой. Тестовые открытия (бот, владелец, кабинет, локальный IP) в отчёт не входят.`}
      />

      <div className={styles.content}>
        <div className={styles.metrics}>
          <div className={`qrs-dash-stat-card ${styles.metric}`}>
            <div
              className="tnum"
              style={{
                font: "var(--fw-extra) 1.9rem/1 var(--font-display)",
                color: "var(--text-strong)",
              }}
            >
              {report.activatedWorkspaces}
            </div>
            <div
              style={{
                font: "var(--fw-medium) 13px/1.35 var(--font-sans)",
                color: "var(--text-muted)",
              }}
            >
              Активированных пространств
            </div>
          </div>
          <div className={`qrs-dash-stat-card ${styles.metric}`}>
            <div
              className="tnum"
              style={{
                font: "var(--fw-extra) 1.9rem/1 var(--font-display)",
                color: "var(--text-strong)",
              }}
            >
              {report.paidWorkspaces}
            </div>
            <div
              style={{
                font: "var(--fw-medium) 13px/1.35 var(--font-sans)",
                color: "var(--text-muted)",
              }}
            >
              Оплативших на сервере
            </div>
          </div>
          <div className={`qrs-dash-stat-card ${styles.metric}`}>
            <div
              className="tnum"
              style={{
                font: "var(--fw-extra) 1.9rem/1 var(--font-display)",
                color: "var(--text-strong)",
              }}
            >
              {report.createdToActivated} → {report.activatedToPaid}
            </div>
            <div
              style={{
                font: "var(--fw-medium) 13px/1.35 var(--font-sans)",
                color: "var(--text-muted)",
              }}
            >
              Создание→активация → активация→оплата
            </div>
          </div>
        </div>

        <AdminCard className={styles.explanation}>
          <p
            style={{
              font: "var(--fw-regular) 14px/1.55 var(--font-sans)",
              color: "var(--text-default)",
              margin: 0,
            }}
          >
            {report.definitions.activation}
          </p>
          <p
            style={{
              font: "var(--fw-regular) 14px/1.55 var(--font-sans)",
              color: "var(--text-default)",
              margin: "12px 0 0",
            }}
          >
            {report.definitions.payment}
          </p>
          <p
            style={{
              font: "var(--fw-medium) 13px/1.45 var(--font-sans)",
              color: "var(--text-muted)",
              margin: "12px 0 0",
            }}
          >
            Исключено тестовых событий: {report.excludedTestEvents} из{" "}
            {report.totalEventsInWindow} за окно.
          </p>
        </AdminCard>

        <section className={styles.section}>
          <h2
            style={{
              font: "var(--fw-bold) 1.15rem/1.2 var(--font-display)",
              color: "var(--text-strong)",
              margin: 0,
            }}
          >
            Шаги (уникальные пространства)
          </h2>
          <AdminDataCard>
            {report.steps.every((step) => step.workspaces === 0) ? (
              <div style={{ padding: 24 }}>
                <Alert variant="info" title="Пока нет серверных событий">
                  Цепочка появится после регистрации, сохранения QR, скачивания
                  файла, внешнего открытия и подтверждённой оплаты.
                </Alert>
              </div>
            ) : (
              <div className="qrs-scroll qrs-data-table-wrap">
                <table className="qrs-data-table">
                  <thead>
                    <tr>
                      <th>Шаг</th>
                      <th>Событие</th>
                      <th>Пространств</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.steps.map((step) => (
                      <tr key={step.name}>
                        <td>{step.label}</td>
                        <td>
                          <code>{step.name}</code>
                        </td>
                        <td className="tnum">{step.workspaces}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminDataCard>
        </section>

        <section className={styles.section}>
          <h2
            style={{
              font: "var(--fw-bold) 1.15rem/1.2 var(--font-display)",
              color: "var(--text-strong)",
              margin: 0,
            }}
          >
            Когорты по ISO-неделе (Москва)
          </h2>
          <AdminDataCard>
            {report.cohorts.length === 0 ? (
              <div style={{ padding: 24 }}>
                <Alert variant="info" title="Когорт пока нет">
                  Новые пространства за 180 дней появятся здесь. Локальные
                  тестовые регистрации исключены.
                </Alert>
              </div>
            ) : (
              <div className="qrs-scroll qrs-data-table-wrap">
                <table className="qrs-data-table">
                  <thead>
                    <tr>
                      <th>Неделя</th>
                      <th>Регистрации</th>
                      <th>Сохранили QR</th>
                      <th>Активация</th>
                      <th>Оплата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.cohorts.map((row) => (
                      <tr key={row.week}>
                        <td className="tnum">{row.week}</td>
                        <td className="tnum">{row.registered}</td>
                        <td className="tnum">{row.created}</td>
                        <td className="tnum">{row.activated}</td>
                        <td className="tnum">{row.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminDataCard>
        </section>
      </div>
    </div>
  );
}
