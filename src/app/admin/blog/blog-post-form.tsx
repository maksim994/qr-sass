"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
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

function formatStructuredDataForEdit(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

type BlogPostData = {
  id?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
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
};

export function BlogPostForm({ post, mode, categories = [] }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContentImageUrl, setLastContentImageUrl] = useState("");
  const [state, setState] = useState<BlogPostData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    metaTitle: post?.metaTitle ?? "",
    metaDescription: post?.metaDescription ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    coverImageUrl: post?.coverImageUrl ?? "",
    authorName: post?.authorName ?? "",
    readingTimeMinutes: post?.readingTimeMinutes ?? "",
    structuredData: post?.structuredData ?? "",
    published: post?.published ?? false,
    categoryId: post?.categoryId ?? "",
  });

  useEffect(() => {
    if (post) {
      setState({
        title: post.title,
        slug: post.slug,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        authorName: post.authorName,
        readingTimeMinutes: post.readingTimeMinutes,
        structuredData: post.structuredData,
        published: post.published,
        categoryId: post.categoryId,
      });
    }
  }, [post]);

  const autoSlug = !post || mode === "create";
  useEffect(() => {
    if (autoSlug && state.title) setState((s) => ({ ...s, slug: slugify(s.title) }));
  }, [state.title, autoSlug]);

  function insertContentImage(url: string) {
    const img = `<p><img src="${url}" alt="" /></p>`;
    setState((s) => ({ ...s, content: s.content ? `${s.content}\n${img}` : img }));
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
          if (!structuredData || typeof structuredData !== "object" || Array.isArray(structuredData)) {
            throw new Error("Микроразметка должна быть JSON-объектом");
          }
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : "Некорректный JSON в поле микроразметки");
        }
      }

      const readingRaw = state.readingTimeMinutes.trim();
      let readingTimeMinutes: number | undefined;
      if (readingRaw) {
        const rt = Number(readingRaw);
        if (!Number.isFinite(rt) || rt < 1 || rt > 999) {
          throw new Error("Время чтения: число от 1 до 999 минут");
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
        coverImageUrl: state.coverImageUrl.trim() || null,
        authorName: state.authorName.trim() || null,
        structuredData,
        categoryId: state.categoryId.trim() || null,
        publishedAt: state.published ? new Date().toISOString() : null,
      };
      if (readingTimeMinutes !== undefined) body.readingTimeMinutes = readingTimeMinutes;

      if (mode === "create") {
        const res = await fetchApi("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Ошибка сохранения");
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
        if (!json.ok) throw new Error(json.error ?? "Ошибка сохранения");
        router.push("/admin/blog");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          required
          placeholder="Название статьи"
        />
      </Field>

      <Field label="Slug (URL)" htmlFor="blog-slug" required>
        <Input
          id="blog-slug"
          type="text"
          value={state.slug}
          onChange={(e) => setState((s) => ({ ...s, slug: e.target.value }))}
          required
          placeholder="url-friendly-slug"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Автор" htmlFor="blog-author">
          <Input
            id="blog-author"
            type="text"
            value={state.authorName}
            onChange={(e) => setState((s) => ({ ...s, authorName: e.target.value }))}
            placeholder="Имя автора для отображения на сайте"
          />
        </Field>
        <Field label="Категория" htmlFor="blog-category">
          <Select
            id="blog-category"
            value={state.categoryId}
            onChange={(e) => setState((s) => ({ ...s, categoryId: e.target.value }))}
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

      <Field label="Время чтения (мин)" htmlFor="blog-reading-time" hint="Авто из текста, если пусто">
        <Input
          id="blog-reading-time"
          type="number"
          min={1}
          max={999}
          value={state.readingTimeMinutes}
          onChange={(e) => setState((s) => ({ ...s, readingTimeMinutes: e.target.value }))}
          placeholder="Например: 5"
          className="max-w-xs"
        />
      </Field>

      <Field label="Meta Title (SEO)" htmlFor="blog-meta-title">
        <Input
          id="blog-meta-title"
          type="text"
          value={state.metaTitle}
          onChange={(e) => setState((s) => ({ ...s, metaTitle: e.target.value }))}
          placeholder="Заголовок для поисковиков (по умолчанию — заголовок статьи)"
        />
      </Field>

      <Field label="Meta Description (SEO)" htmlFor="blog-meta-desc">
        <textarea
          id="blog-meta-desc"
          className="fk-input min-h-[60px]"
          value={state.metaDescription}
          onChange={(e) => setState((s) => ({ ...s, metaDescription: e.target.value }))}
          placeholder="Описание для поисковиков и соцсетей (до ~160 символов)"
          rows={2}
        />
      </Field>

      <Field label="Краткое описание" htmlFor="blog-excerpt" hint="2–3 предложения для превью в списке (опционально)">
        <textarea
          id="blog-excerpt"
          className="fk-input min-h-[80px]"
          value={state.excerpt}
          onChange={(e) => setState((s) => ({ ...s, excerpt: e.target.value }))}
          placeholder="Краткое описание статьи"
          rows={3}
        />
      </Field>

      <Field label="Контент">
        <div className="qrs-admin-editor-card">
          <RichTextEditor
            key={post?.id ?? "new"}
            content={state.content}
            onChange={(html) => setState((s) => ({ ...s, content: html }))}
          />
        </div>
      </Field>

      <Field
        label="Изображение в тексте статьи"
        hint="Загрузите картинку — URL можно вставить в HTML-контент или добавить кнопкой ниже."
      >
        <CoverImageUpload
          uploadEndpoint="/api/admin/blog/upload-content"
          onUploaded={(url) => setLastContentImageUrl(url)}
        />
        {lastContentImageUrl ? (
          <div className="qrs-upload-result">
            <p className="qrs-upload-result__url">{lastContentImageUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(lastContentImageUrl)}>
                Скопировать URL
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => insertContentImage(lastContentImageUrl)}>
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

      <Field label="Микроразметка (JSON-LD)" htmlFor="blog-structured-data" hint="Опционально. Если пусто — генерируется автоматически.">
        <textarea
          id="blog-structured-data"
          className="fk-input min-h-[160px] font-mono text-sm"
          value={state.structuredData}
          onChange={(e) => setState((s) => ({ ...s, structuredData: e.target.value }))}
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
          onChange={(e) => setState((s) => ({ ...s, published: e.target.checked }))}
        />
        <span className="fk-choice__box" aria-hidden="true">
          <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="fk-choice__text">Опубликовать</span>
      </label>

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

export { formatStructuredDataForEdit };
