"use client";
import styles from "@/components/admin/admin.module.css";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import editorStyles from "@/components/admin/markdown-editor.module.css";
import { extractLegacyFaq, type BlogFaq } from "@/lib/blog-faq";
import type { ArticleBody } from "@/lib/blog-render";
import { MSG } from "@/lib/user-messages";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type BlogPostData = {
  id?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  format: "html" | "markdown";
  faq: BlogFaq;
  showPrintSizeIntro: boolean;
  legacyHtml?: string | null;
  expectedUpdatedAt?: string;
  wasPublished?: boolean;
  coverImageUrl: string;
  authorName: string;
  readingTimeMinutes: string;
  structuredData: string;
  published: boolean;
  categoryId: string;
};

type CategoryOption = { id: string; name: string };

type Props = {
  post?: BlogPostData;
  mode: "create" | "edit";
  categories?: CategoryOption[];
  initialBody?: ArticleBody;
};

export function BlogPostForm({ post, mode, categories = [], initialBody }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minorEdit, setMinorEdit] = useState(false);
  const [confirmConversion, setConfirmConversion] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [lastContentImageUrl, setLastContentImageUrl] = useState("");
  const [state, setState] = useState<BlogPostData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    metaTitle: post?.metaTitle ?? "",
    metaDescription: post?.metaDescription ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    format: post?.format ?? "markdown",
    faq: post?.faq ?? [],
    showPrintSizeIntro: post?.showPrintSizeIntro ?? true,
    legacyHtml: post?.legacyHtml,
    expectedUpdatedAt: post?.expectedUpdatedAt,
    wasPublished: post?.wasPublished,
    coverImageUrl: post?.coverImageUrl ?? "",
    authorName: post?.authorName ?? "",
    readingTimeMinutes: post?.readingTimeMinutes ?? "",
    structuredData: post?.structuredData ?? "",
    published: post?.published ?? false,
    categoryId: post?.categoryId ?? "",
  });

  const autoSlug = !post || mode === "create";

  const legacyFaq = extractLegacyFaq(state.structuredData);

  function insertContentImage(url: string) {
    if (!imageAlt.trim() || state.format !== "markdown") return;
    const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const img = `<figure><img src="${escapeAttribute(url)}" alt="${escapeAttribute(imageAlt.trim())}" loading="lazy"></figure>`;
    setState(current => ({ ...current, content: current.content ? `${current.content}\n\n${img}` : img }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let structuredData: unknown = null;
      const sdRaw = state.structuredData.trim();
      if (sdRaw) {
        try {
          structuredData = JSON.parse(sdRaw);
          if (
            !structuredData ||
            typeof structuredData !== "object" ||
            Array.isArray(structuredData)
          ) {
            throw new Error(MSG.BLOG_STRUCTURED_INVALID);
          }
        } catch (err) {
          throw new Error(
            err instanceof Error
              ? err.message
              : MSG.BLOG_STRUCTURED_INVALID,
          );
        }
      }

      const readingRaw = state.readingTimeMinutes.trim();
      let readingTimeMinutes: number | undefined;
      if (readingRaw) {
        const rt = Number(readingRaw);
        if (!Number.isFinite(rt) || rt < 1 || rt > 999) {
          throw new Error(MSG.BLOG_READING_INVALID);
        }
        readingTimeMinutes = Math.round(rt);
      }

      const body: Record<string, unknown> = {
        title: state.title.trim(),
        slug: slugify(state.slug) || slugify(state.title),
        metaTitle: state.metaTitle.trim() || null,
        metaDescription: state.metaDescription.trim() || null,
        excerpt: state.excerpt.trim() || null,
        content: state.content,
        format: state.format,
        faq: state.faq,
        showPrintSizeIntro: state.showPrintSizeIntro,
        minorEdit,
        confirmConversion,
        ...(state.expectedUpdatedAt ? { expectedUpdatedAt: state.expectedUpdatedAt } : {}),
        coverImageUrl: state.coverImageUrl.trim() || null,
        authorName: state.authorName.trim() || null,
        structuredData,
        categoryId: state.categoryId.trim() || null,
        published: state.published,
      };
      if (readingTimeMinutes !== undefined)
        body.readingTimeMinutes = readingTimeMinutes;

      if (mode === "create") {
        const res = await fetchApi("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? MSG.BLOG_SAVE_FAILED);
        router.push("/admin/blog");
        router.refresh();
      } else if (post?.id) {
        const res = await fetchApi(`/api/admin/blog/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? MSG.BLOG_SAVE_FAILED);
        router.push("/admin/blog");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : MSG.BLOG_SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={styles.stack}>
      {error ? (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Field label="Заголовок" htmlFor="blog-title" required>
        <Input
          id="blog-title"
          type="text"
          value={state.title}
          onChange={(e) => { const title = e.target.value; setState((s) => ({ ...s, title, ...(autoSlug ? { slug: slugify(title) } : {}) })); }}
          required
          placeholder="Название статьи"
        />
      </Field>

      <Field label="Slug (URL)" htmlFor="blog-slug" required>
        <Input
          id="blog-slug"
          readOnly={state.wasPublished}
          aria-describedby={state.wasPublished ? "slug-help" : undefined}
          type="text"
          value={state.slug}
          onChange={(e) => setState((s) => ({ ...s, slug: e.target.value }))}
          required
          placeholder="url-friendly-slug"
        />
      </Field>

      {state.wasPublished && <p id="slug-help">Адрес опубликованной статьи закреплён, чтобы сохранить существующие ссылки.</p>}

      <div className={styles.formColumns}>
        <Field label="Автор" htmlFor="blog-author">
          <Input
            id="blog-author"
            type="text"
            value={state.authorName}
            onChange={(e) =>
              setState((s) => ({ ...s, authorName: e.target.value }))
            }
            placeholder="Имя автора для отображения на сайте"
          />
        </Field>
        <Field label="Категория" htmlFor="blog-category">
          <Select
            id="blog-category"
            value={state.categoryId}
            onChange={(e) =>
              setState((s) => ({ ...s, categoryId: e.target.value }))
            }
          >
            <option value="">Без категории</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Время чтения (мин)"
        htmlFor="blog-reading-time"
        hint="Авто из текста, если пусто"
      >
        <Input
          id="blog-reading-time"
          type="number"
          min={1}
          max={999}
          value={state.readingTimeMinutes}
          onChange={(e) =>
            setState((s) => ({ ...s, readingTimeMinutes: e.target.value }))
          }
          placeholder="Например: 5"
          className="max-w-xs"
        />
      </Field>

      <Field label="Meta Title (SEO)" htmlFor="blog-meta-title">
        <Input
          id="blog-meta-title"
          type="text"
          value={state.metaTitle}
          onChange={(e) =>
            setState((s) => ({ ...s, metaTitle: e.target.value }))
          }
          placeholder="Заголовок для поисковиков (по умолчанию — заголовок статьи)"
        />
      </Field>

      <Field label="Meta Description (SEO)" htmlFor="blog-meta-desc">
        <textarea
          id="blog-meta-desc"
          className="fk-input min-h-[60px]"
          value={state.metaDescription}
          onChange={(e) =>
            setState((s) => ({ ...s, metaDescription: e.target.value }))
          }
          placeholder="Описание для поисковиков и соцсетей (до ~160 символов)"
          rows={2}
        />
      </Field>

      <Field
        label="Краткое описание"
        htmlFor="blog-excerpt"
        hint="2–3 предложения для превью в списке (опционально)"
      >
        <textarea
          id="blog-excerpt"
          className="fk-input min-h-[80px]"
          value={state.excerpt}
          onChange={(e) => setState((s) => ({ ...s, excerpt: e.target.value }))}
          placeholder="Краткое описание статьи"
          rows={3}
        />
      </Field>

      <Field label="Контент" htmlFor="blog-content">
        <MarkdownEditor id={post?.id} content={state.content} format={state.format}
          faq={state.faq} slug={state.slug} initialBody={initialBody} legacyHtml={state.legacyHtml}
          onChange={content => setState(current => ({ ...current, content }))}
          onConvert={content => {
            setConfirmConversion(true);
            setState(current => ({ ...current, content, format: "markdown", legacyHtml: current.legacyHtml ?? current.content }));
          }} />
      </Field>

      <fieldset>
        <legend>Частые вопросы</legend>
        <p className={editorStyles.hint}>Один источник для текста на странице и FAQPage. Вставьте [[faq]] в отдельной строке Markdown; без метки FAQ появится в конце. Если в теле уже есть раздел «Частые вопросы», он будет заменён блоком из полей.</p>
        {legacyFaq.length > 0 && !state.faq.length && <div>
          <p>В ручной микроразметке найден FAQ: {legacyFaq.length} вопросов. Проверьте тексты после переноса.</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setState(current => ({ ...current, faq: legacyFaq }))}>Перенести FAQ в поля</Button>
        </div>}
        {state.faq.map((item, index) => <div key={index} className={editorStyles.faq}>
          <label htmlFor={`faq-question-${index}`}>Вопрос {index + 1}
            <Input id={`faq-question-${index}`} value={item.question} maxLength={500} required onChange={event => setState(current => ({ ...current, faq: current.faq.map((value, position) => position === index ? { ...value, question: event.target.value } : value) }))} />
          </label>
          <label htmlFor={`faq-answer-${index}`}>Ответ {index + 1}
            <textarea id={`faq-answer-${index}`} className="fk-input" rows={3} value={item.answer} maxLength={10000} required onChange={event => setState(current => ({ ...current, faq: current.faq.map((value, position) => position === index ? { ...value, answer: event.target.value } : value) }))} />
          </label>
          <div className={editorStyles.faqActions}>
            <Button type="button" variant="secondary" size="sm" disabled={index === 0} aria-label={`Поднять вопрос ${index + 1}`} onClick={() => setState(current => { const faq = [...current.faq]; [faq[index - 1], faq[index]] = [faq[index], faq[index - 1]]; return { ...current, faq }; })}>Выше</Button>
            <Button type="button" variant="secondary" size="sm" disabled={index === state.faq.length - 1} aria-label={`Опустить вопрос ${index + 1}`} onClick={() => setState(current => { const faq = [...current.faq]; [faq[index], faq[index + 1]] = [faq[index + 1], faq[index]]; return { ...current, faq }; })}>Ниже</Button>
            <Button type="button" variant="secondary" size="sm" aria-label={`Удалить вопрос ${index + 1}`} onClick={() => setState(current => ({ ...current, faq: current.faq.filter((_, position) => position !== index) }))}>Удалить вопрос</Button>
          </div>
        </div>)}
        <Button type="button" variant="secondary" size="sm" disabled={state.faq.length >= 100} onClick={() => setState(current => ({ ...current, faq: [...current.faq, { question: "", answer: "" }] }))}>Добавить вопрос</Button>
      </fieldset>

      <label className="fk-choice fk-choice--checkbox">
        <input type="checkbox" className="fk-choice__input" checked={state.showPrintSizeIntro} onChange={event => setState(current => ({ ...current, showPrintSizeIntro: event.target.checked }))} />
        <span className="fk-choice__box" aria-hidden="true"><svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
        <span className="fk-choice__text">Показывать блок «Размер QR для пробной печати»</span>
      </label>

      <Field
        label="Изображение в тексте статьи"
        hint="Загрузите картинку, укажите описание и добавьте её в Markdown. В HTML-режиме сначала подтвердите конвертацию."
      >
        <CoverImageUpload
          uploadEndpoint="/api/admin/blog/upload-content"
          onUploaded={(url) => setLastContentImageUrl(url)}
        />
        {lastContentImageUrl ? (
          <div className="qrs-upload-result">
            <p className="qrs-upload-result__url">{lastContentImageUrl}</p>
            <Field label="Описание картинки (alt)" htmlFor="blog-image-alt">
              <Input id="blog-image-alt" value={imageAlt} onChange={event => setImageAlt(event.target.value)} placeholder="Что изображено на картинке" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(lastContentImageUrl)
                }
              >
                Скопировать URL
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={state.format !== "markdown" || !imageAlt.trim()}
                onClick={() => insertContentImage(lastContentImageUrl)}
              >
                Вставить в контент
              </Button>
            </div>
          </div>
        ) : null}
      </Field>

      <Field label="Обложка статьи">
        <CoverImageUpload
          currentUrl={state.coverImageUrl || undefined}
          onUploaded={(url) => setState((s) => ({ ...s, coverImageUrl: url }))}
        />
        {state.coverImageUrl ? (
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, coverImageUrl: "" }))}
            className="qrs-data-action"
            style={{ marginTop: 8, color: "var(--text-muted)" }}
          >
            Убрать обложку
          </button>
        ) : null}
      </Field>

      <Field
        label="Микроразметка (JSON-LD)"
        htmlFor="blog-structured-data"
        hint="Дополнение к автоматической разметке. BlogPosting и FAQPage задаются полями статьи; эти типы из ручного JSON-LD повторно не выводятся."
      >
        <textarea
          id="blog-structured-data"
          className="fk-input min-h-[160px] font-mono text-sm"
          value={state.structuredData}
          onChange={(e) =>
            setState((s) => ({ ...s, structuredData: e.target.value }))
          }
          placeholder={'{"@context": "https://schema.org", ...}'}
          rows={8}
        />
      </Field>

      <label className="fk-choice fk-choice--checkbox">
        <input
          type="checkbox"
          id="published"
          className="fk-choice__input"
          checked={state.published}
          onChange={(e) =>
            setState((s) => ({ ...s, published: e.target.checked }))
          }
        />
        <span className="fk-choice__box" aria-hidden="true">
          <svg
            className="fk-icon"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="fk-choice__text">Опубликовать</span>
      </label>

      {mode === "edit" && <label className="fk-choice fk-choice--checkbox">
        <input type="checkbox" className="fk-choice__input" checked={minorEdit} onChange={event => setMinorEdit(event.target.checked)} />
        <span className="fk-choice__box" aria-hidden="true"><svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
        <span className="fk-choice__text">Мелкая правка, дату не менять</span>
      </label>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : mode === "create" ? "Создать" : "Сохранить"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
