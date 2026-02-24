import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { BlogPostContent } from "@/components/blog/blog-post-content";
import { ArticleUsefulBlock } from "@/components/blog/article-useful-block";
import { BlogViewTracker } from "@/components/blog/blog-view-tracker";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}К`;
  return String(n);
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
      views: true,
      likes: true,
      readingTimeMinutes: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
  if (!post) notFound();

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const articleUrl = `${base}/blog/${post.slug}`;
  const seoDescription = post.metaDescription?.trim() || (post.excerpt ?? post.title);

  const articleId = `${articleUrl}#article`;
  const webpageId = `${articleUrl}#webpage`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: articleUrl,
        name: post.metaTitle?.trim() || `${post.title} — Блог qr-s.ru`,
        description: seoDescription,
        mainEntity: { "@id": articleId },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Главная", item: base },
            { "@type": "ListItem", position: 2, name: "Блог", item: `${base}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: articleUrl },
          ],
        },
      },
      {
        "@type": "Article",
        "@id": articleId,
        headline: post.title,
        description: seoDescription,
        image: post.coverImageUrl ?? undefined,
        datePublished: post.publishedAt!.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        url: articleUrl,
        mainEntityOfPage: { "@id": webpageId },
        author: { "@type": "Organization", name: "qr-s.ru", url: base },
        publisher: { "@type": "Organization", name: "qr-s.ru", url: base },
        ...(post.likes > 0 && {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: post.likes,
          },
        }),
      },
    ],
  };

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("ru", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="bg-slate-50">
      <BlogViewTracker slug={post.slug} />
      <article className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← К списку статей
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
            <header className="min-w-0 flex-1">
              <span className="badge">Блог</span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                  {publishedDate}
                </span>
                {post.readingTimeMinutes != null && (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {post.readingTimeMinutes} мин чтения
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {formatViews(post.views)} просмотров
                </span>
              </div>
            </header>

            <div className="shrink-0 w-full lg:w-80">
              {post.coverImageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
                  <Image
                    src={post.coverImageUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 320px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-blue-600/10">
                  <svg
                    className="h-16 w-16 text-blue-600/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <BlogPostContent content={post.content} />
          <div className="mt-12">
            <ArticleUsefulBlock slug={post.slug} initialLikes={post.likes} />
          </div>
        </div>
      </section>

      <nav className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6">
          <Link
            href="/blog"
            className="card-flat inline-block px-6 py-3 text-slate-600 transition hover:text-slate-900 hover:border-slate-300"
          >
            ← Все статьи блога
          </Link>
        </div>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
