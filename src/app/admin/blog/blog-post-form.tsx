"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";

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
};

type Props = {
  post?: BlogPostData;
  mode: "create" | "edit";
};

export function BlogPostForm({ post, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
      alert(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="label">Заголовок</label>
        <input
          type="text"
          className="input"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          required
          placeholder="Название статьи"
        />
      </div>
      <div>
        <label className="label">Slug (URL)</label>
        <input
          type="text"
          className="input"
          value={state.slug}
          onChange={(e) => setState((s) => ({ ...s, slug: e.target.value }))}
          required
          placeholder="url-friendly-slug"
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label">Автор</label>
          <input
            type="text"
            className="input"
            value={state.authorName}
            onChange={(e) => setState((s) => ({ ...s, authorName: e.target.value }))}
            placeholder="Имя автора для отображения на сайте"
          />
        </div>
        <div>
          <label className="label">Время чтения (мин)</label>
          <input
            type="number"
            min={1}
            max={999}
            className="input"
            value={state.readingTimeMinutes}
            onChange={(e) => setState((s) => ({ ...s, readingTimeMinutes: e.target.value }))}
            placeholder="Авто из текста, если пусто"
          />
        </div>
      </div>
      <div>
        <label className="label">Meta Title (SEO)</label>
        <input
          type="text"
          className="input"
          value={state.metaTitle}
          onChange={(e) => setState((s) => ({ ...s, metaTitle: e.target.value }))}
          placeholder="Заголовок для поисковиков (по умолчанию — заголовок статьи)"
        />
      </div>
      <div>
        <label className="label">Meta Description (SEO)</label>
        <textarea
          className="input min-h-[60px]"
          value={state.metaDescription}
          onChange={(e) => setState((s) => ({ ...s, metaDescription: e.target.value }))}
          placeholder="Описание для поисковиков и соцсетей (до ~160 символов)"
          rows={2}
        />
      </div>
      <div>
        <label className="label">Краткое описание (для превью в списке, опционально)</label>
        <textarea
          className="input min-h-[80px]"
          value={state.excerpt}
          onChange={(e) => setState((s) => ({ ...s, excerpt: e.target.value }))}
          placeholder="2–3 предложения для превью"
          rows={3}
        />
      </div>
      <div>
        <label className="label">Контент</label>
        <RichTextEditor
          key={post?.id ?? "new"}
          content={state.content}
          onChange={(html) => setState((s) => ({ ...s, content: html }))}
        />
      </div>
      <div>
        <label className="label">Изображение в тексте статьи</label>
        <p className="mb-2 text-xs text-slate-500">
          Загрузите картинку — URL можно вставить в HTML-контент или добавить кнопкой ниже.
        </p>
        <CoverImageUpload
          uploadEndpoint="/api/admin/blog/upload-content"
          onUploaded={(url) => setLastContentImageUrl(url)}
        />
        {lastContentImageUrl && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="break-all text-xs text-slate-600">{lastContentImageUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn text-sm"
                onClick={() => navigator.clipboard.writeText(lastContentImageUrl)}
              >
                Скопировать URL
              </button>
              <button
                type="button"
                className="btn text-sm"
                onClick={() => insertContentImage(lastContentImageUrl)}
              >
                Вставить в контент
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="label">Обложка статьи</label>
        <CoverImageUpload
          currentUrl={state.coverImageUrl || undefined}
          onUploaded={(url) => setState((s) => ({ ...s, coverImageUrl: url }))}
        />
        {state.coverImageUrl && (
          <p className="mt-2">
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, coverImageUrl: "" }))}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Убрать обложку
            </button>
          </p>
        )}
      </div>
      <div>
        <label className="label">Микроразметка (JSON-LD)</label>
        <textarea
          className="input min-h-[160px] font-mono text-sm"
          value={state.structuredData}
          onChange={(e) => setState((s) => ({ ...s, structuredData: e.target.value }))}
          placeholder={'Опционально. JSON-объект schema.org. Если пусто — генерируется автоматически.'}
          rows={8}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          checked={state.published}
          onChange={(e) => setState((s) => ({ ...s, published: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="published" className="text-sm font-medium text-slate-700">
          Опубликовать
        </label>
      </div>
      <div className="flex gap-4">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Сохранение…" : mode === "create" ? "Создать" : "Сохранить"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn">
          Отмена
        </button>
      </div>
    </form>
  );
}

export { formatStructuredDataForEdit };
