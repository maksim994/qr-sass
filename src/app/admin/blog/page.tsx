import Link from "next/link";
import { getDb } from "@/lib/db";
import { BlogList } from "./blog-list";

export default async function AdminBlogPage() {
  const db = getDb();
  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      views: true,
      readingTimeMinutes: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Блог</h1>
          <p className="mt-1 text-sm text-slate-500">Статьи для SEO-продвижения. Черновики не отображаются на сайте.</p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary btn-sm shrink-0">
          Новая статья
        </Link>
      </div>
      <div className="card overflow-hidden">
        <BlogList posts={posts} />
      </div>
    </div>
  );
}
