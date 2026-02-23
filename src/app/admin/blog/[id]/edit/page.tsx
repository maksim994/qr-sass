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
    <div>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Редактирование</h1>
        <Link href={`/blog/${post.slug}`} className="text-sm text-slate-500 hover:text-slate-700" target="_blank">
          Посмотреть на сайте →
        </Link>
      </div>
      <p className="mt-1 text-slate-600">{post.title}</p>
      <div className="card mt-6 p-6">
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
