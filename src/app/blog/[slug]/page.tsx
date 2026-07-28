import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { BlogPostContent } from "@/components/blog/blog-post-content";
import { ArticleUsefulBlock } from "@/components/blog/article-useful-block";
import { BlogViewTracker } from "@/components/blog/blog-view-tracker";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { RelatedPosts } from "@/components/blog/related-posts";
import { ArticleShare } from "@/components/blog/article-share";
import { buildDefaultArticleJsonLd, parseStructuredDataForPage } from "@/lib/blog-structured-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}К`;
  return String(n);
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({
    where: { slug, publishedAt: { not: null } },
  });
  if (!post) return { title: "Статья не найдена" };

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${base}/blog/${post.slug}`;
  const seoTitle = post.metaTitle?.trim() || `${post.title} — Блог qr-s.ru`;
  const seoDescription = post.metaDescription?.trim() || (post.excerpt ?? post.title);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: url },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      url,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({
    where: { slug, publishedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      metaTitle: true,
      metaDescription: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      authorName: true,
      structuredData: true,
      views: true,
      likes: true,
      readingTimeMinutes: true,
      publishedAt: true,
      updatedAt: true,
      categoryId: true,
      category: { select: { slug: true, name: true } },
    },
  });
  if (!post) notFound();

  const relatedWhere = {
    publishedAt: { not: null },
    slug: { not: slug },
    ...(post.categoryId ? { categoryId: post.categoryId } : {}),
  };

  let relatedPosts = await db.blogPost.findMany({
    where: relatedWhere,
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      readingTimeMinutes: true,
      category: { select: { slug: true, name: true } },
    },
  });

  if (relatedPosts.length < 3 && post.categoryId) {
    const fallback = await db.blogPost.findMany({
      where: { publishedAt: { not: null }, slug: { not: slug }, categoryId: { not: post.categoryId } },
      orderBy: { publishedAt: "desc" },
      take: 3 - relatedPosts.length,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
        readingTimeMinutes: true,
        category: { select: { slug: true, name: true } },
      },
    });
    relatedPosts = [...relatedPosts, ...fallback];
  } else if (relatedPosts.length < 3) {
    const fallback = await db.blogPost.findMany({
      where: { publishedAt: { not: null }, slug: { not: slug } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
        readingTimeMinutes: true,
        category: { select: { slug: true, name: true } },
      },
    });
    relatedPosts = fallback;
  }

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const articleUrl = `${base}/blog/${post.slug}`;
  const seoTitle = post.metaTitle?.trim() || `${post.title} — Блог qr-s.ru`;
  const seoDescription = post.metaDescription?.trim() || (post.excerpt ?? post.title);

  const customJsonLd = parseStructuredDataForPage(post.structuredData);
  const jsonLd =
    customJsonLd ??
    buildDefaultArticleJsonLd({
      base,
      articleUrl,
      title: post.title,
      seoTitle,
      seoDescription,
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt!,
      updatedAt: post.updatedAt,
      likes: post.likes,
      authorName: post.authorName,
    });

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("ru", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <main style={{ background: "var(--surface-page)" }}>
      <BlogViewTracker slug={post.slug} />

      <section
        style={{
          padding: "clamp(32px, 5vw, 56px) 0 clamp(20px, 3vw, 32px)",
          background: "radial-gradient(120% 80% at 85% -30%, var(--color-primary-subtle) 0%, transparent 50%), var(--surface-page)",
        }}
      >
        <div className="fk-container" style={{ maxWidth: "820px" }}>
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Блог", href: "/blog" },
              { label: post.title },
            ]}
          />
          <header style={{ marginTop: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ padding: "5px 13px", borderRadius: "999px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", font: "var(--fw-bold) 12px/1 var(--font-sans)" }}>
                {post.category?.name ?? "Блог"}
              </span>
              {post.readingTimeMinutes != null && (
                <span style={{ font: "var(--fw-medium) 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                  {post.readingTimeMinutes} минут чтения
                </span>
              )}
            </div>
            <h1 style={{ font: "var(--fw-extra) clamp(2rem, 4.6vw, 3rem)/1.1 var(--font-display)", color: "var(--text-strong)", letterSpacing: "-0.03em", textWrap: "balance" }}>
              {post.title}
            </h1>
            {post.excerpt && (
              <p style={{ marginTop: "18px", font: "var(--fw-regular) clamp(1.05rem, 2vw, 1.2rem)/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
                {post.excerpt}
              </p>
            )}
            <div style={{ marginTop: "26px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", paddingTop: "22px", borderTop: "1px solid var(--border-subtle)" }}>
              {post.authorName ? (
                <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{ width: "44px", height: "44px", borderRadius: "999px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", font: "var(--fw-bold) 15px/1 var(--font-sans)" }}
                  >
                    {authorInitials(post.authorName)}
                  </span>
                  <span>
                    <span style={{ display: "block", font: "var(--fw-semibold) 14px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>{post.authorName}</span>
                    <span style={{ display: "block", marginTop: "3px", font: "var(--fw-regular) 12px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                      {publishedDate ?? "Блог QR-S.ru"}
                    </span>
                  </span>
                </span>
              ) : null}
              <span style={{ font: "var(--fw-medium) 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>{formatViews(post.views)} просмотров</span>
              <ArticleShare url={articleUrl} title={post.title} />
            </div>
          </header>
        </div>
      </section>

      <section style={{ paddingBottom: "clamp(24px, 4vw, 44px)" }}>
        <div className="fk-container" style={{ maxWidth: "900px" }}>
          <div
            className={post.coverImageUrl ? "relative overflow-hidden" : ""}
            style={{ height: "clamp(220px, 34vw, 380px)", borderRadius: "16px", border: "1px solid var(--border-subtle)", background: "linear-gradient(135deg, var(--color-primary-subtle), color-mix(in srgb, var(--color-accent) 16%, transparent))", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {post.coverImageUrl ? (
              <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" priority sizes="(max-width:1000px) 100vw, 900px" />
            ) : (
              <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3M20 20v.01M14 20h.01M20 14v3" />
              </svg>
            )}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--section-y)" }}>
        <div className="fk-container">
          <BlogPostContent content={post.content} />
          <div style={{ maxWidth: "720px", margin: "48px auto 0" }}>
            <ArticleUsefulBlock slug={post.slug} initialLikes={post.likes} />
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--section-y)", borderTop: "1px solid var(--border-subtle)" }}>
        <div className="fk-container" style={{ paddingTop: "clamp(40px, 5vw, 64px)" }}>
          <RelatedPosts
            posts={relatedPosts.map((p) => ({
              ...p,
              publishedAt: p.publishedAt!,
            }))}
          />
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
