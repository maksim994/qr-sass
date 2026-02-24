import { BlogPostForm } from "../blog-post-form";

export default function NewBlogPostPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Новая статья</h1>
        <p className="mt-1 text-sm text-slate-500">Создайте статью для блога. Slug генерируется из заголовка.</p>
      </div>
      <div className="card p-6">
        <BlogPostForm mode="create" />
      </div>
    </div>
  );
}
