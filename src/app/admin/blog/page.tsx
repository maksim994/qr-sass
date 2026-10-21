import { getDb } from "@/lib/db";
import { BlogList } from "./blog-list";
import { AdminPageHeader, AdminDataCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui";

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
      status: true,
      scheduledAt: true,
      createdAt: true,
      updatedAt: true,
      pendingRevision: { select: { id: true } },
    },
  });

  return (
    <div>
      <AdminPageHeader
        title="Блог"
        description="Статьи для SEO-продвижения. Черновики не отображаются на сайте."
        action={
          <Button href="/admin/blog/new" size="sm" className="shrink-0">
            Новая статья
          </Button>
        }
      />
      <p><Button href="/admin/blog/history" variant="secondary" size="sm">Журнал изменений статей →</Button>{" "}<Button href="/admin/blog/tokens" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">API-ключи статей ↗</Button></p>
      <AdminDataCard>
        <BlogList posts={posts} />
      </AdminDataCard>
    </div>
  );
}
