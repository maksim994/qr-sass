import { BlogPostForm } from "../blog-post-form";
import { ensureBlogCategories } from "@/lib/blog-categories";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";

export default async function NewBlogPostPage() {
  const categories = await ensureBlogCategories();

  return (
    <div>
      <AdminPageHeader
        title="Новая статья"
        description="Создайте статью для блога. Slug генерируется из заголовка."
      />
      <AdminCard>
        <BlogPostForm mode="create" categories={categories} />
      </AdminCard>
    </div>
  );
}
