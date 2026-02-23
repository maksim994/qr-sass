import { BlogPostForm } from "../blog-post-form";

export default function NewBlogPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Новая статья</h1>
      <p className="mt-1 text-slate-600">Создайте статью для блога. Slug генерируется из заголовка.</p>
      <div className="card mt-6 p-6">
        <BlogPostForm mode="create" />
      </div>
    </div>
  );
}
