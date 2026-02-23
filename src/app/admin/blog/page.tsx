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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Блог</h1>
          <p className="mt-1 text-slate-600">Статьи для SEO-продвижения. Черновики не отображаются на сайте.</p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary">
          Новая статья
        </Link>
      </div>
      <div className="card mt-6 overflow-hidden">
        <BlogList posts={posts} />
      </div>
    </div>
  );
}
