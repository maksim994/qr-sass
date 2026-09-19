"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { previewBulkCsv, type BulkPreview } from "@/lib/bulk-preview";
import { MSG } from "@/lib/user-messages";
import styles from "./bulk-upload.module.css";

type Props = { workspaceId: string; bulkLimit: number };
const TEMPLATE = '\uFEFFurl,name,utm_source,utm_medium,utm_campaign\nhttps://example.com/menu,Меню кафе,print,qr,summer\nhttps://example.com/catalog,Каталог,print,qr,summer\n';
export function BulkUploadClient({ workspaceId, bulkLimit }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [download, setDownload] = useState<{url:string;count:number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const fileVersion = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error || download) feedbackRef.current?.focus(); }, [error, download]);
  useEffect(() => { const url = download?.url; return () => { if (url) URL.revokeObjectURL(url); }; }, [download]);

  async function pickFile(next: File | null) {
    if (pending.current) return;
    const version = ++fileVersion.current;
    setFile(next); setPreview(null); setError(""); setUncertain(false); setDownload(null); setReading(false);
    if (!next) { if (inputRef.current) inputRef.current.value = ""; return; }
    if (!next.name.toLowerCase().endsWith(".csv") && next.type !== "text/csv") { setError(MSG.UNSUPPORTED_BULK_FORMAT); return; }
    if (next.size > 1_048_576) { setError(MSG.BULK_FILE_TOO_LARGE); return; }
    setReading(true);
    try {
      const result = previewBulkCsv(await next.text());
      if (version !== fileVersion.current) return;
      setPreview(result);
      if (result.rows.length > bulkLimit) setError(MSG.BULK_TOO_MANY_ROWS);
    } catch { if (version === fileVersion.current) setError(MSG.BULK_FILE_READ_FAILED); }
    finally { if (version === fileVersion.current) setReading(false); }
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !file || !preview || reading || preview.issues.length || preview.rows.length === 0 || preview.rows.length > bulkLimit || download) return;
    pending.current = true; setLoading(true); setError(""); setUncertain(false);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("workspaceId", workspaceId);
      const res = await fetchApi("/api/qr/bulk", { method: "POST", body: fd });
      if (!res.ok) {
        const parsed = await parseApiResponse(res);
        setError(parsed.error ?? MSG.COULD_NOT_CREATE_BULK); setUncertain(res.status >= 500); return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownload({ url, count: preview.rows.length });
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "qr-codes.zip"; anchor.click();
      router.refresh();
    } catch { setError(MSG.COULD_NOT_CREATE_BULK); setUncertain(true); }
    finally { pending.current = false; setLoading(false); }
  }
  const ready = !!preview && preview.rows.length > 0 && preview.rows.length <= bulkLimit && preview.issues.length === 0;
  if (bulkLimit === 0 && !download) return <section className={styles.panel}><h2>Лимит QR-кодов исчерпан</h2><p className={styles.hint}>Освободите место в библиотеке или выберите тариф с большим лимитом.</p><div className={styles.actions}><Link href="/dashboard/library" className="fk-button fk-button--secondary">Открыть библиотеку</Link><Link href="/dashboard/billing" className="fk-button fk-button--ghost">Посмотреть тарифы</Link></div></section>;
  return <div className={styles.flow}>
    <section className={styles.guide}><div><h2>Подготовьте таблицу</h2><p>Одна запись — один динамический QR-код. Нужна колонка <code>url</code>; название можно указать в <code>name</code>.</p></div><a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="qr-template.csv" className="fk-button fk-button--secondary">Скачать шаблон CSV</a></section>
    <form onSubmit={handleSubmit} className={styles.panel}>
      <div className={styles.sectionHead}><h2>Загрузите CSV</h2><span>До {bulkLimit} кодов · файл до 1 МБ</span></div>
      <div className={`${styles.drop} ${dragActive ? styles.dragActive : ""}`} onDragOver={e => { e.preventDefault(); if (!loading) setDragActive(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false); }} onDrop={e => { e.preventDefault(); setDragActive(false); if (!loading) void pickFile(e.dataTransfer.files[0] ?? null); }}>
        <p>{file ? file.name : "Перетащите файл сюда"}</p><span>{file ? `${Math.max(1,Math.ceil(file.size/1024))} КБ` : "или выберите CSV на устройстве"}</span>
        <button type="button" className="fk-button fk-button--secondary" onClick={() => inputRef.current?.click()} disabled={loading}>{file ? "Заменить файл" : "Выбрать файл"}</button>
        {file && <button type="button" className={styles.clear} onClick={() => void pickFile(null)} disabled={loading}>Убрать файл</button>}
        <input ref={inputRef} type="file" accept=".csv,text/csv" onClick={e => { e.currentTarget.value = ""; }} onChange={e => void pickFile(e.target.files?.[0] ?? null)} disabled={loading} hidden aria-label="Файл CSV"/>
      </div>
      {reading && <p className={styles.status} role="status">Проверяем содержимое файла…</p>}
      {preview && !download && <div className={styles.preview}>
        <h3>{preview.issues.length ? "Исправьте ошибки в файле" : `QR-кодов к созданию: ${preview.rows.length}`}</h3>
        {preview.issues.length ? <><p className={styles.hint}>Создание не начнётся, пока ошибки не исправлены. Номера записей указаны без заголовка таблицы.</p><ul className={styles.issues}>{preview.issues.slice(0,10).map((issue,i) => <li key={i}>{issue.record > 0 ? `Запись ${issue.record}: ` : ""}{issue.message}</li>)}</ul>{preview.issues.length>10 && <p className={styles.hint}>Показаны первые 10 из {preview.issues.length} ошибок.</p>}</> : <>
          <p className={styles.hint}>Предпросмотр записей: {Math.min(5,preview.rows.length)}. UTM-параметры уже включены в ссылки.</p><div className={styles.tableWrap}><table><thead><tr><th scope="col">Название</th><th scope="col">Ссылка назначения</th></tr></thead><tbody>{preview.rows.slice(0,5).map((row,i)=><tr key={i}><td>{row.name}</td><td>{row.url}</td></tr>)}</tbody></table></div>
        </>}
      </div>}
      {(error || download) && <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}>{error ? <Alert variant="danger">{error}{uncertain && <p>Часть кодов могла сохраниться. <Link href="/dashboard/library">Проверьте библиотеку</Link> перед повторной попыткой.</p>}</Alert> : download && <div className={styles.result}><h3>Создано QR-кодов: {download.count}</h3><p>Скачивание ZIP началось. Коды доступны в библиотеке.</p><div><a href={download.url} download="qr-codes.zip" className="fk-button fk-button--secondary">Скачать ZIP ещё раз</a><Link href="/dashboard/library" className="fk-button fk-button--ghost">Открыть библиотеку</Link></div></div>}</div>}
      {!download && <div className={styles.actions}><button type="submit" disabled={loading || reading || !ready} className="fk-button fk-button--primary">{loading ? "Создаём коды и собираем ZIP…" : "Создать и скачать ZIP"}</button><p>{loading ? "Дождитесь завершения и не закрывайте страницу." : "В архиве будут PNG-файлы. Коды сохранятся в библиотеке."}</p></div>}
    </form>
    <details className={styles.format}><summary>Формат файла и дополнительные колонки</summary><p>Сохраните таблицу Excel как CSV в кодировке UTF-8. Поддерживаются разделители запятая и точка с запятой.</p><pre>url,name{`\n`}https://example.com/menu,Меню кафе</pre><p>Обязательно: <code>url</code>. По желанию: <code>name</code>, <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code>, <code>utm_content</code>.</p></details>
  </div>;
}
