"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
import { Button } from "@/components/ui";
import type { ArticleBody } from "@/lib/blog-render";
import type { BlogFaq } from "@/lib/blog-faq";
import styles from "./markdown-editor.module.css";

type Conversion = { markdown: string; before: ArticleBody; after: ArticleBody; diff: { added?: boolean; removed?: boolean; value: string }[] };
type Props = {
  id?: string;
  content: string;
  format: "html" | "markdown";
  faq: BlogFaq;
  slug: string;
  initialBody?: ArticleBody;
  legacyHtml?: string | null;
  onChange: (value: string) => void;
  onConvert: (value: string) => void;
};

export function MarkdownEditor({ id, content, format, faq, slug, initialBody, legacyHtml, onChange, onConvert }: Props) {
  const [body, setBody] = useState<ArticleBody>(initialBody ?? { html: "", items: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetchApi("/api/admin/blog/preview", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, format, faq, slug }), signal: controller.signal,
        });
        const json = await response.json();
        if (!json.ok) throw new Error(json.error || MSG.BLOG_PREVIEW_FAILED);
        if (!controller.signal.aborted) setBody(json.data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : MSG.BLOG_PREVIEW_FAILED);
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [content, format, faq, slug, retry]);

  async function convert() {
    setConverting(true); setError("");
    try {
      const response = await fetchApi(`/api/admin/blog/${id}/convert`, { method: "POST" });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || MSG.BLOG_CONVERT_FAILED);
      setConversion(json.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : MSG.BLOG_CONVERT_FAILED); }
    finally { setConverting(false); }
  }

  return <div className={styles.editor}>
    <div className={styles.toolbar}>
      <p>{format === "html" ? "HTML · только чтение" : "Markdown · таблицы, списки, ссылки"}</p>
      {format === "html" && id && <Button type="button" variant="secondary" size="sm" onClick={convert} disabled={converting}>
        {converting ? "Подготовка сравнения…" : "Конвертировать в Markdown"}
      </Button>}
    </div>
    {format === "html" && <p className={styles.hint}>Исходный HTML сохранён дословно. Для правки подготовьте конвертацию и сравните результат.</p>}
    {error && <div role="alert" className={styles.error}>{error} <Button type="button" size="sm" variant="secondary" onClick={() => setRetry(value => value + 1)}>Повторить предпросмотр</Button></div>}
    <div className={styles.columns}>
      <div className={styles.pane}>
        <label className={styles.label} htmlFor="blog-content">{format === "html" ? "Исходный HTML" : "Текст Markdown"}</label>
        <textarea id="blog-content" className={`fk-input ${styles.source}`} value={content} readOnly={format === "html"} spellCheck={false}
          aria-describedby="markdown-help" onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (format !== "markdown" || event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            event.preventDefault();
            const target = event.currentTarget;
            const start = target.selectionStart, end = target.selectionEnd;
            onChange(content.slice(0, start) + "\t" + content.slice(end));
            requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 1; });
          }} />
        <p id="markdown-help" className={styles.hint}>Якорь: ## Заголовок {"{#id}"}. Место FAQ: [[faq]]. Tab вставляет табуляцию; Shift+Tab выводит фокус из поля.</p>
      </div>
      <section className={styles.pane} aria-label="Предпросмотр статьи" aria-busy={busy}>
        <div className={styles.label}>Предпросмотр <span role="status">{busy ? "· обновляется…" : ""}</span></div>
        <div className={`qrs-body ${styles.preview}`}>
          {body.html ? <div dangerouslySetInnerHTML={{ __html: body.html }} /> : <p className={styles.hint}>Начните писать — здесь появится статья.</p>}
        </div>
      </section>
    </div>
    {conversion && <section className={styles.conversion} aria-label="Сравнение конвертации">
      <h3>Проверьте конвертацию</h3>
      <p>Изменения показаны после нормализации пробелов и порядка атрибутов. Конвертация может изменить оформление. Исходный HTML останется в резервной копии после сохранения статьи.</p>
      <label className={styles.label} htmlFor="conversion-markdown">Получившийся Markdown</label>
      <textarea id="conversion-markdown" className={`fk-input ${styles.source}`} readOnly value={conversion.markdown} rows={10} />
      <div className={styles.columns}>
        <div><h4>До конвертации</h4><div className={`qrs-body ${styles.comparison}`} dangerouslySetInnerHTML={{ __html: conversion.before.html }} /></div>
        <div><h4>После конвертации</h4><div className={`qrs-body ${styles.comparison}`} dangerouslySetInnerHTML={{ __html: conversion.after.html }} /></div>
      </div>
      <details><summary>Различия HTML: − удалено, + добавлено</summary><pre className={styles.diff}>{conversion.diff.map((part, index) => <span key={index} className={part.added ? styles.added : part.removed ? styles.removed : undefined}>{part.value.split("\n").map((line, lineIndex) => <span key={lineIndex}>{part.added ? "+ " : part.removed ? "− " : "  "}{line}{"\n"}</span>)}</span>)}</pre></details>
      <div className={styles.actions}>
        <Button type="button" onClick={() => { onConvert(conversion.markdown); setConversion(null); }}>Подтвердить переход в Markdown</Button>
        <Button type="button" variant="secondary" onClick={() => setConversion(null)}>Оставить HTML</Button>
      </div>
      <p className={styles.hint}>После подтверждения нажмите «Сохранить» внизу формы. До сохранения статья на сайте не меняется.</p>
    </section>}
    {legacyHtml && <details><summary>Исходный HTML до конвертации</summary><textarea aria-label="Резервная копия HTML" className={`fk-input ${styles.source}`} value={legacyHtml} readOnly rows={10} /></details>}
  </div>;
}
