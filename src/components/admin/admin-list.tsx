import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { scalar, type AdminSearchParams } from "@/lib/admin-list";
import styles from "./admin.module.css";
export function AdminFilters({
  params,
  placeholder,
  filters = [],
}: {
  params: AdminSearchParams;
  placeholder: string;
  filters?: { name: string; label: string; options: [string, string][] }[];
}) {
  return (
    <form key={JSON.stringify(params)} className={styles.toolbar}>
      {["days", "stale"].map((name) =>
        scalar(params[name]) ? (
          <input
            key={name}
            type="hidden"
            name={name}
            value={scalar(params[name])}
          />
        ) : null,
      )}
      {scalar(params.workspace) && (
        <input
          type="hidden"
          name="workspace"
          value={scalar(params.workspace)}
        />
      )}
      {scalar(params.days) && (
        <span className={styles.note}>За {scalar(params.days)} дней</span>
      )}
      {scalar(params.stale) === "1" && (
        <span className={styles.note}>Ожидают более 30 минут</span>
      )}
      <label className={styles.search}>
        Поиск
        <Input
          name="q"
          defaultValue={scalar(params.q)}
          placeholder={placeholder}
          maxLength={150}
        />
      </label>
      {filters.map((filter) => (
        <label key={filter.name}>
          {filter.label}
          <Select name={filter.name} defaultValue={scalar(params[filter.name])}>
            {filter.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      ))}
      <label>
        На странице
        <Select
          name="size"
          defaultValue={
            ["25", "50", "100"].includes(scalar(params.size))
              ? scalar(params.size)
              : "25"
          }
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit">Найти</Button>
      <Link href="?" className={styles.back}>
        Сбросить
      </Link>
    </form>
  );
}
export function AdminPagination({
  total,
  page,
  size,
  params,
}: {
  total: number;
  page: number;
  size: number;
  params: AdminSearchParams;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  function href(next: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string") query.set(key, value);
    query.set("page", String(next));
    return `?${query}`;
  }
  return (
    <nav aria-label="Страницы списка" className={styles.pagination}>
      <span>
        Найдено: {total} · Страница {page} из {pages}
      </span>
      <div className={styles.actions}>
        {page > 1 && (
          <Button href={href(page - 1)} variant="secondary">
            Назад
          </Button>
        )}
        {page < pages && (
          <Button href={href(page + 1)} variant="secondary">
            Далее
          </Button>
        )}
      </div>
    </nav>
  );
}
