"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { adminDate } from "@/lib/admin-list";
import { seoLengthWarnings } from "@/lib/seo-page-fields";
import { MSG } from "@/lib/user-messages";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import adminStyles from "@/components/admin/admin.module.css";
import styles from "./seo-pages.module.css";

export type SeoPageRow = {
  path: string;
  label: string;
  title: string;
  description: string;
  heading: string | null;
  noindex: boolean;
  override: {
    metaTitle: string | null;
    metaDescription: string | null;
    heading: string | null;
    noindex: boolean | null;
  } | null;
  resolved: {
    title: string;
    description: string;
    heading: string;
    noindex: boolean;
  };
  updatedAt: string | null;
};

type Revision = {
  id: string;
  number: number;
  actorName: string;
  createdAt: string;
  snapshot: SeoPageRow["override"];
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function SeoPagesAdmin({ rows }: { rows: SeoPageRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.path.toLowerCase().includes(q) ||
        row.label.toLowerCase().includes(q) ||
        row.resolved.title.toLowerCase().includes(q),
    );
  }, [query, rows]);

  const selected = rows.find((row) => row.path === selectedPath) ?? null;

  return (
    <div className={adminStyles.stack}>
      <label className={styles.filter}>
        Поиск по URL или названию
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="/qr-dlya-max" />
      </label>
      <div className={styles.layout}>
        <div className={adminStyles.tableWrap}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>URL</th>
                <th>Title</th>
                <th>Description</th>
                <th>H1</th>
                <th>Noindex</th>
                <th>Изменено</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.path} className={selectedPath === row.path ? styles.selectedRow : undefined}>
                  <td data-label="URL">
                    <button type="button" className={styles.pathButton} onClick={() => setSelectedPath(row.path)}>
                      {row.path}
                    </button>
                    <span className={styles.pathLabel}>{row.label}</span>
                  </td>
                  <td data-label="Title">{row.resolved.title}</td>
                  <td data-label="Description">{row.resolved.description}</td>
                  <td data-label="H1">{row.resolved.heading}</td>
                  <td data-label="Noindex">{row.resolved.noindex ? "да" : "нет"}</td>
                  <td data-label="Изменено">{row.updatedAt ? adminDate(row.updatedAt) : "из кода"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected ? (
          <SeoPageEditor
            key={`${selected.path}:${selected.updatedAt ?? "code"}`}
            row={selected}
            onClose={() => setSelectedPath(null)}
            onSaved={() => router.refresh()}
          />
        ) : (
          <p className={styles.hint}>Выберите строку, чтобы изменить мета-теги или откатить версию.</p>
        )}
      </div>
    </div>
  );
}

function SeoPageEditor({
  row,
  onClose,
  onSaved,
}: {
  row: SeoPageRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(row.updatedAt);
  const [metaTitle, setMetaTitle] = useState(row.override?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(row.override?.metaDescription ?? "");
  const [heading, setHeading] = useState(row.override?.heading ?? "");
  const [noindexMode, setNoindexMode] = useState<"default" | "yes" | "no">(
    row.override?.noindex === null || row.override?.noindex === undefined
      ? "default"
      : row.override.noindex
        ? "yes"
        : "no",
  );
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const preview = useMemo(() => {
    const resolvedTitle = metaTitle.trim() || row.title;
    const resolvedDescription = metaDescription.trim() || row.description;
    const resolvedHeading = heading.trim() || row.heading || row.title;
    const resolvedNoindex =
      noindexMode === "default" ? row.noindex : noindexMode === "yes";
    return {
      title: resolvedTitle,
      description: resolvedDescription,
      heading: resolvedHeading,
      noindex: resolvedNoindex,
      warnings: seoLengthWarnings(resolvedTitle, resolvedDescription),
    };
  }, [metaTitle, metaDescription, heading, noindexMode, row]);

  async function loadHistory() {
    if (historyLoaded || historyBusy) return;
    setHistoryBusy(true);
    setError(null);
    try {
      const response = await fetchApi(`/api/admin/seo-pages/history?path=${encodeURIComponent(row.path)}`);
      const parsed = await parseApiResponse<{ revisions: Revision[] }>(response);
      if (!parsed.ok || !parsed.data) {
        setError(parsed.error || MSG.INVALID_PAYLOAD);
        return;
      }
      setRevisions(parsed.data.revisions);
      setHistoryLoaded(true);
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      setHistoryBusy(false);
    }
  }

  async function save() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setSaved(false);
    setConflict(false);
    try {
      const response = await fetchApi("/api/admin/seo-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: row.path,
          metaTitle: emptyToNull(metaTitle),
          metaDescription: emptyToNull(metaDescription),
          heading: emptyToNull(heading),
          noindex: noindexMode === "default" ? null : noindexMode === "yes",
          expectedUpdatedAt: updatedAt,
        }),
      });
      const parsed = await parseApiResponse<{ updatedAt: string }>(response);
      if (!parsed.ok || !parsed.data) {
        setConflict(parsed.code === "CONFLICT");
        setError(parsed.error || MSG.INVALID_PAYLOAD);
        return;
      }
      setSaved(true);
      setUpdatedAt(parsed.data.updatedAt);
      setHistoryLoaded(false);
      onSaved();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function restore(revisionId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setSaved(false);
    setConflict(false);
    try {
      const response = await fetchApi("/api/admin/seo-pages/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: row.path, revisionId, expectedUpdatedAt: updatedAt }),
      });
      const parsed = await parseApiResponse<{ updatedAt: string }>(response);
      if (!parsed.ok || !parsed.data) {
        setConflict(parsed.code === "CONFLICT");
        setError(parsed.error || MSG.INVALID_PAYLOAD);
        return;
      }
      setSaved(true);
      setUpdatedAt(parsed.data.updatedAt);
      const snapshot = revisions.find(revision => revision.id === revisionId)?.snapshot;
      if (snapshot) {
        setMetaTitle(snapshot.metaTitle ?? "");
        setMetaDescription(snapshot.metaDescription ?? "");
        setHeading(snapshot.heading ?? "");
        setNoindexMode(snapshot.noindex == null ? "default" : snapshot.noindex ? "yes" : "no");
      }
      setHistoryLoaded(false);
      onSaved();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <aside className={styles.editor} aria-label={`Редактор ${row.path}`}>
      <div className={styles.editorHead}>
        <h2>{row.path}</h2>
        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>
          Закрыть
        </Button>
      </div>
      <p className={styles.defaults}>
        Пустое поле берёт значение из кода. Сейчас в коде: title «{row.title}», H1 «{row.heading ?? "—"}».
      </p>
      {error ? (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {conflict ? <Button type="button" variant="secondary" onClick={onSaved}>Загрузить актуальную версию</Button> : null}
      {saved ? <p role="status">{MSG.SEO_PAGE_SAVED}</p> : null}
      <Field label="Title (override)">
        <Input maxLength={500} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} disabled={busy} />
      </Field>
      {preview.warnings.title ? <p className={styles.warn}>{preview.warnings.title}</p> : null}
      <Field label="Description (override)">
        <textarea
          className="fk-input"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={4}
          maxLength={1000}
          disabled={busy}
        />
      </Field>
      {preview.warnings.description ? <p className={styles.warn}>{preview.warnings.description}</p> : null}
      <Field label="H1 (override)">
        <Input maxLength={500} value={heading} onChange={(e) => setHeading(e.target.value)} disabled={busy} />
      </Field>
      <Field label="Noindex">
        <Select
          value={noindexMode}
          onChange={(e) => setNoindexMode(e.target.value as "default" | "yes" | "no")}
          disabled={busy}
        >
          <option value="default">Как в коде ({row.noindex ? "noindex" : "index"})</option>
          <option value="yes">Noindex</option>
          <option value="no">Index</option>
        </Select>
      </Field>
      <div className={styles.preview}>
        <h3>Итог для сайта</h3>
        <p>
          <strong>Title:</strong> {preview.title}
        </p>
        <p>
          <strong>Description:</strong> {preview.description}
        </p>
        <p>
          <strong>H1:</strong> {preview.heading}
        </p>
        <p>
          <strong>Noindex:</strong> {preview.noindex ? "да" : "нет"}
        </p>
      </div>
      <div className={styles.actions}>
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void loadHistory()} disabled={busy || historyBusy}>
          {historyBusy ? "Загружаем историю…" : "История"}
        </Button>
      </div>
      {historyLoaded ? (
        revisions.length ? (
          <ul className={styles.history}>
            {revisions.map((revision) => (
              <li key={revision.id}>
                <div>
                  <strong>#{revision.number}</strong> · {adminDate(revision.createdAt)} · {revision.actorName}
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void restore(revision.id)}>
                  Откатить
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>История правок пока пуста.</p>
        )
      ) : null}
    </aside>
  );
}
