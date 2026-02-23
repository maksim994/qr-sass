"use client";

import Link from "next/link";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  views: number;
  readingTimeMinutes: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  posts: Post[];
};

export function BlogList({ posts }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Заголовок</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Slug</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Просмотры</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Время чтения</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Статус</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Дата</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {posts.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                Нет статей. <Link href="/admin/blog/new" className="text-slate-700 underline">Создать</Link>
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id} className="bg-white hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900">{post.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{post.slug}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{post.views}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {post.readingTimeMinutes ? `${post.readingTimeMinutes} мин` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      post.publishedAt
                        ? "inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {post.publishedAt ? "Опубликован" : "Черновик"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("ru")
                    : new Date(post.createdAt).toLocaleDateString("ru")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/blog/${post.id}/edit`}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Редактировать
                  </Link>
                  {" · "}
                  <DeleteButton postId={post.id} postTitle={post.title} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DeleteButton({ postId, postTitle }: { postId: string; postTitle: string }) {
  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!confirm(`Удалить статью «${postTitle}»?`)) return;
    const res = await fetch(`/api/admin/blog/${postId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Ошибка удаления");
      return;
    }
    window.location.reload();
  }
  return (
    <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700">
      Удалить
    </button>
  );
}
