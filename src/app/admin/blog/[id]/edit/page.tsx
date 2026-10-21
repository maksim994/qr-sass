import { BlogMergeControl } from "@/components/admin/blog-merge-control";
import { PendingRevisionPanel } from "@/components/admin/blog-pending-revision-panel";
import { PreviewLinkControl } from "@/components/admin/blog-workflow-actions";
import { articleStatus } from "@/lib/blog-workflow";
import { formatMoscowInput } from "@/lib/blog-publication";
import { readBlogFaq } from "@/lib/blog-faq";
import { renderArticleBody } from "@/lib/blog-render";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { ensureBlogCategories } from "@/lib/blog-categories";
import { BlogPostForm } from "../../blog-post-form";
import { formatStructuredDataForEdit } from "@/lib/blog-structured-data";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const [post, categories] = await Promise.all([
    db.blogPost.findUnique({ where: { id }, include: { pendingRevision: true } }),
    ensureBlogCategories(),
  ]);
  if (!post) notFound();
  const redirects = await db.blogRedirect.findMany({ select: { source: true } });
  const targets = await db.blogPost.findMany({ where: { id: { not: id }, publishedAt: { not: null }, slug: { notIn: redirects.filter(row => row.source.startsWith("/blog/")).map(row => row.source.slice(6)) } }, select: { id: true, title: true, slug: true }, orderBy: { title: "asc" } });

  return (
    <div>
      <AdminPageHeader
        title="Редактирование"
        description={post.title}
        action={
          <Button href={`/admin/blog/${post.id}/versions`} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
            История версий →
          </Button>
        }
      />
      {post.pendingRevision && <PendingRevisionPanel post={post} pending={post.pendingRevision} />}
      <AdminCard>
        <BlogPostForm
          key={post.updatedAt.toISOString()}
          mode="edit"
          initialBody={renderArticleBody(post.format === "markdown" ? post.content : sanitizeBlogFields({ slug: post.slug, content: post.content }).content, post.format === "markdown" ? "markdown" : "html", post.faq)}
          categories={categories}
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            metaTitle: post.metaTitle ?? "",
            metaDescription: post.metaDescription ?? "",
            excerpt: post.excerpt ?? "",
            content: post.content,
            format: post.format === "markdown" ? "markdown" : "html",
            faq: readBlogFaq(post.faq),
            showPrintSizeIntro: post.showPrintSizeIntro,
            legacyHtml: post.legacyHtml,
            expectedUpdatedAt: post.updatedAt.toISOString(),
            wasPublished: !!(post.firstPublishedAt ?? post.publishedAt),
            coverImageUrl: post.coverImageUrl ?? "",
            coverImageAlt: post.coverImageAlt ?? "",
            authorName: post.authorName ?? "",
            readingTimeMinutes: post.readingTimeMinutes != null ? String(post.readingTimeMinutes) : "",
            structuredData: formatStructuredDataForEdit(post.structuredData),
            status: articleStatus(post) as "draft" | "scheduled" | "published",
            scheduledAt: formatMoscowInput(post.scheduledAt),
            categoryId: post.categoryId ?? "",
            tags: post.tags,
            relatedArticleIds: post.relatedArticleIds,
          }}
        />
      </AdminCard>
      {post.publishedAt && <AdminCard>
        <BlogMergeControl id={post.id} expectedUpdatedAt={post.updatedAt.toISOString()} targets={targets} />
      </AdminCard>}
      <AdminCard>
        <PreviewLinkControl id={post.id} active={!!await db.blogPreviewToken.findFirst({ where: { postId: post.id, pendingRevisionId: null, revokedAt: null }, select: { hash: true } })} />
        {post.publishedAt && <p><a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">Посмотреть на сайте →</a></p>}
      </AdminCard>
    </div>
  );
}
