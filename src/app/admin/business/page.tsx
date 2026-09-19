import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { Button, Select } from "@/components/ui";
import { getBusinessReport } from "@/lib/business-report";
import { scalar, type AdminSearchParams } from "@/lib/admin-list";
import styles from "@/components/admin/admin.module.css";
export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams,
    days = [7, 30, 90].includes(Number(scalar(params.days)))
      ? Number(params.days)
      : 30,
    isTest = scalar(params.mode) === "test",
    report = await getBusinessReport(days, isTest);
  return (
    <>
      <AdminPageHeader
        title="Бизнес и триалы"
        description="Регистрации, пробный доступ и подтверждённые оплаты."
        action={
          <form className={styles.filters}>
            <label>
              Период
              <Select name="days" defaultValue={days}>
                {[7, 30, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} дней
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Данные
              <Select name="mode" defaultValue={isTest ? "test" : "real"}>
                <option value="real">Реальные</option>
                <option value="test">Тестовые</option>
              </Select>
            </label>
            <Button type="submit" variant="secondary">
              Применить
            </Button>
          </form>
        }
      />
      <div className={styles.pageStack}>
        <p className={styles.note}>
          События учитываются с момента включения нового журнала. На локальном
          сервере регистрации и триалы помечаются тестовыми. Сегодняшний день
          неполный. Часовой пояс — Москва.
        </p>
        <div className={styles.metrics}>
          {[
            ["Новые пользователи", report.count("registration_completed")],
            ["Начали триал · кабинеты", report.count("trial_started")],
            ["Подтверждённые оплаты", report.payments],
            [
              "Оплаты без возвратов",
              `${report.money.toLocaleString("ru-RU")} ₽`,
            ],
          ].map(([label, value]) => (
            <section key={label} className={styles.panel}>
              <h2 className={styles.note}>{label}</h2>
              <p className={styles.metricValue}>{value}</p>
            </section>
          ))}
        </div>
        {report.legacy > 0 && (
          <p className={styles.note}>
            У {report.legacy} старых успешных платежей неизвестно время
            подтверждения. Они не включены в сумму за период.
          </p>
        )}
        <div className={styles.stack}>
          <section className={styles.section}>
            <h2 className={styles.title}>События по дням</h2>
            <div className={styles.tableWrap}>
              {report.daily.length ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Дата · МСК</th>
                      <th>Регистрации</th>
                      <th>Начало триала</th>
                      <th>События оплаты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((row) => (
                      <tr key={row.day}>
                        <td data-label="Дата">{row.day}</td>
                        <td data-label="Регистрации">
                          {String(row.registrations)}
                        </td>
                        <td data-label="Триалы">{String(row.trials)}</td>
                        <td data-label="Оплаты">{String(row.payments)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.empty}>
                  За этот период событий пока нет. Данные появятся после
                  регистраций, активации триалов и оплат.
                </p>
              )}
            </div>
          </section>
          <section className={styles.section}>
            <h2 className={styles.title}>Из триала в оплату</h2>
            <p className={styles.note}>
              Группы по неделе начала триала. Окно наблюдения: 14 дней триала +
              7 дней на оплату. Конверсия считается только для кабинетов с
              завершённым окном. Ручная выдача доступа не считается оплатой.
            </p>
            <div className={styles.tableWrap}>
              {report.cohorts.length ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Неделя</th>
                      <th>Начали</th>
                      <th>Окно завершено</th>
                      <th>Оплатили в окне</th>
                      <th>Конверсия</th>
                      <th>Ещё наблюдаем</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.cohorts.map((row) => (
                      <tr key={row.week}>
                        <td data-label="Неделя">{row.week}</td>
                        <td data-label="Начали">{String(row.started)}</td>
                        <td data-label="Окно завершено">
                          {String(row.mature)}
                        </td>
                        <td data-label="Оплатили">{String(row.converted)}</td>
                        <td data-label="Конверсия">
                          {Number(row.mature)
                            ? `${Math.round((Number(row.converted) / Number(row.mature)) * 100)}%`
                            : "Пока рано считать"}
                        </td>
                        <td data-label="Ещё наблюдаем">
                          {String(row.pending)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.empty}>
                  Триалов в выбранном периоде пока нет.
                </p>
              )}
            </div>
          </section>
          <div className={styles.actions}>
            <Link className={styles.link} href="/admin/funnel">
              Воронка использования QR
            </Link>
            <Link className={styles.link} href="/admin/payments">
              Все платежи
            </Link>
            <Link className={styles.link} href="/admin/notifications">
              Telegram-уведомления
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
