"use client";

import Link from "next/link";
import { fetchApi } from "@/lib/client-api";
import { Alert, Badge } from "@/components/ui";

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
  if (posts.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert variant="info" title="Нет статей">
          <Link href="/admin/blog/new" className="qrs-navlink">
            Создать первую статью
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="qrs-scroll qrs-data-table-wrap">
      <table className="qrs-data-table">
        <thead>
          <tr>
            <th>Заголовок</th>
            <th>Просмотры</th>
            <th>Время чтения</th>
            <th>Статус</th>
            <th>Дата</th>
            <th aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>{post.title}</td>
              <td className="tnum">{post.views}</td>
              <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>
                {post.readingTimeMinutes ? `${post.readingTimeMinutes} мин` : "—"}
              </td>
              <td>
                <Badge variant={post.publishedAt ? "success" : "info"}>
                  {post.publishedAt ? "Опубликован" : "Черновик"}
                </Badge>
              </td>
              <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("ru")
                  : new Date(post.createdAt).toLocaleDateString("ru")}
              </td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <Link href={`/admin/blog/${post.id}/edit`} className="qrs-data-action" style={{ color: "var(--color-primary)" }}>
                  Редактировать
                </Link>
                {" · "}
                <DeleteButton postId={post.id} postTitle={post.title} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteButton({ postId, postTitle }: { postId: string; postTitle: string }) {
  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!confirm(`Удалить статью «${postTitle}»?`)) return;
    const res = await fetchApi(`/api/admin/blog/${postId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Ошибка удаления");
      return;
    }
    window.location.reload();
  }
  return (
    <button type="button" onClick={handleDelete} className="qrs-data-action qrs-data-action--danger">
      Удалить
    </button>
  );
}
