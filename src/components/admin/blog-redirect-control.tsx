"use client";
// Operate: incumbent fk/Manrope admin. Source → final destination → rule list;
// fixed legacy rules remain visible. Finish: usable keyboard/mobile, explicit errors and delete confirmation.
import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { fetchApi } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
import styles from "./admin.module.css";
import css from "./blog-redirect-control.module.css";
type Rule = {
  id: string;
  source: string;
  target: string;
  code: number;
  comment: string | null;
  actorName: string;
  createdAt: string | null;
  locked: boolean;
};
export function BlogRedirectControl({
  initialRules,
}: {
  initialRules: Rule[];
}) {
  const [rules, setRules] = useState(initialRules),
    [source, setSource] = useState(""),
    [target, setTarget] = useState(""),
    [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<string | null>(null);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetchApi("/api/admin/blog/redirects", {
        method: "POST",
        body: JSON.stringify({ source, target, comment }),
      });
      const json = await r.json();
      if (!json.ok) throw new Error(json.error || MSG.BLOG_REDIRECT_FAILED);
      setRules((rows) => [json.data, ...rows]);
      setSource("");
      setTarget("");
      setComment("");
      setNotice("Редирект создан и уже работает.");
    } catch (e) {
      setError(e instanceof Error ? e.message : MSG.BLOG_REDIRECT_FAILED);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetchApi(
        `/api/admin/blog/redirects/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const json = await r.json();
      if (!json.ok) throw new Error(json.error || MSG.BLOG_REDIRECT_FAILED);
      setRules((rows) => rows.filter((row) => row.id !== id));
      setConfirm(null);
      setNotice("Редирект удалён. Запись в журнале сохранена.");
    } catch (e) {
      setError(e instanceof Error ? e.message : MSG.BLOG_REDIRECT_FAILED);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={css.stack}>
      <form onSubmit={create} className={css.form}>
        <label htmlFor="redirect-source">
          Откуда
          <Input
            id="redirect-source"
            required
            maxLength={2000}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="/blog/old-address"
          />
          <span>Только путь. Регистр и завершающий слеш нормализуются.</span>
        </label>
        <label htmlFor="redirect-target">
          Куда
          <Input
            id="redirect-target"
            required
            maxLength={4000}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="/blog/final-address или https://…"
          />
          <span>Конечный адрес: цепочки и циклы не разрешены.</span>
        </label>
        <label htmlFor="redirect-comment" className={css.full}>
          Комментарий
          <Input
            id="redirect-comment"
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Зачем переносим адрес (необязательно)"
          />
        </label>
        <Button type="submit" disabled={busy || !source || !target}>
          {busy ? "Сохраняем…" : "Создать редирект 301"}
        </Button>
      </form>
      {error && (
        <p role="alert" className={css.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <p className={css.hint}>
        Опубликованные страницы и маршруты QR защищены от замены. Прежние
        системные правила показаны для справки.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Откуда → куда</th>
              <th>Код</th>
              <th>Автор и дата · МСК</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row) => (
              <tr key={row.id}>
                <td data-label="Откуда → куда">
                  <code className={css.path}>{row.source}</code>
                  <br />
                  <span aria-hidden="true">→ </span>
                  <code className={css.path}>{row.target}</code>
                  {row.comment && <p className={css.hint}>{row.comment}</p>}
                </td>
                <td data-label="Код">{row.code}</td>
                <td data-label="Автор и дата · МСК">
                  {row.actorName}
                  <br />
                  {row.createdAt
                    ? new Intl.DateTimeFormat("ru-RU", {
                        timeZone: "Europe/Moscow",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(row.createdAt))
                    : "Прежнее правило"}
                </td>
                <td data-label="Действия">
                  {row.locked ? (
                    "Системное правило"
                  ) : confirm === row.id ? (
                    <div className={css.actions}>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove(row.id)}
                      >
                        Подтвердить удаление
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirm(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className={css.actions}>
                      <Button
                        href={row.source}
                        target="_blank"
                        rel="noreferrer"
                        variant="secondary"
                        size="sm"
                      >
                        Проверить ↗
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirm(row.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/admin/blog/history?type=redirect_create">
          Журнал создания редиректов
        </Link>
      </p>
    </div>
  );
}
