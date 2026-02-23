"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type BlogPostData = {
  id?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  published: boolean;
};

type Props = {
  post?: BlogPostData;
  mode: "create" | "edit";
};

export function BlogPostForm({ post, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<BlogPostData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    metaTitle: post?.metaTitle ?? "",
    metaDescription: post?.metaDescription ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    coverImageUrl: post?.coverImageUrl ?? "",
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
        published: post.published,
      });
    }
  }, [post]);

  const autoSlug = !post || mode === "create";
  useEffect(() => {
    if (autoSlug && state.title) setState((s) => ({ ...s, slug: slugify(s.title) }));
  }, [state.title, autoSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: state.title.trim(),
        slug: slugify(state.slug) || slugify(state.title),
        metaTitle: state.metaTitle.trim() || null,
        metaDescription: state.metaDescription.trim() || null,
        excerpt: state.excerpt.trim() || null,
        content: state.content,
        coverImageUrl: state.coverImageUrl.trim() || null,
        publishedAt: state.published ? new Date().toISOString() : null,
      };
      if (mode === "create") {
        const res = await fetch("/api/admin/blog", {
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
        const res = await fetch(`/api/admin/blog/${post.id}`, {
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
