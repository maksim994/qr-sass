import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { BlogPostForm } from "../../blog-post-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Редактирование</h1>
          <p className="mt-1 text-sm text-slate-500">{post.title}</p>
        </div>
        <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0" target="_blank">
          Посмотреть на сайте →
        </Link>
      </div>
      <div className="card p-6">
        <BlogPostForm
          mode="edit"
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            metaTitle: post.metaTitle ?? "",
            metaDescription: post.metaDescription ?? "",
            excerpt: post.excerpt ?? "",
            content: post.content,
            coverImageUrl: post.coverImageUrl ?? "",
            published: !!post.publishedAt,
          }}
        />
      </div>
    </div>
  );
}
