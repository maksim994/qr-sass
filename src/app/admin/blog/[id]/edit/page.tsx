import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ensureBlogCategories } from "@/lib/blog-categories";
import { BlogPostForm, formatStructuredDataForEdit } from "../../blog-post-form";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const [post, categories] = await Promise.all([
    db.blogPost.findUnique({ where: { id } }),
    ensureBlogCategories(),
  ]);
  if (!post) notFound();

  return (
    <div>
      <AdminPageHeader
        title="Редактирование"
        description={post.title}
        action={
          <Button href={`/blog/${post.slug}`} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
            Посмотреть на сайте →
          </Button>
        }
      />
      <AdminCard>
        <BlogPostForm
          mode="edit"
          categories={categories}
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            metaTitle: post.metaTitle ?? "",
            metaDescription: post.metaDescription ?? "",
            excerpt: post.excerpt ?? "",
            content: post.content,
            coverImageUrl: post.coverImageUrl ?? "",
            authorName: post.authorName ?? "",
            readingTimeMinutes: post.readingTimeMinutes != null ? String(post.readingTimeMinutes) : "",
            structuredData: formatStructuredDataForEdit(post.structuredData),
            published: !!post.publishedAt,
            categoryId: post.categoryId ?? "",
          }}
        />
      </AdminCard>
    </div>
  );
}
