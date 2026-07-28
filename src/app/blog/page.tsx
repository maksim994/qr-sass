import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { ensureBlogCategories, getBlogCategoryBySlug } from "@/lib/blog-categories";
import { getBlogCardMeta } from "@/lib/blog-card-meta";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { BlogCategoryChips } from "@/components/blog/blog-category-chips";
import { BlogCardIcon } from "@/components/blog/blog-card-icon";
import { NewsletterBlock } from "@/components/blog/newsletter-block";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

type Props = { searchParams: Promise<{ page?: string; category?: string }> };

function formatPostDate(date: Date) {
  return date.toLocaleDateString("ru", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category: categorySlug } = await searchParams;
  if (!categorySlug) {
    return {
      title: "Блог — qr-s.ru",
      description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
      openGraph: {
        title: "Блог — qr-s.ru",
        description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
        url: "/blog",
      },
    };
  }

  const category = await getBlogCategoryBySlug(categorySlug);
  const name = category?.name ?? categorySlug;
  return {
    title: `${name} — Блог qr-s.ru`,
    description: `Статьи в категории «${name}»: гайды, кейсы и аналитика по QR-кодам.`,
    openGraph: {
      title: `${name} — Блог qr-s.ru`,
      url: `/blog?category=${categorySlug}`,
    },
  };
}

export default async function BlogListPage({ searchParams }: Props) {
  const { page: pageParam, category: categorySlug } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [categories, activeCategory] = await Promise.all([
    ensureBlogCategories(),
    categorySlug ? getBlogCategoryBySlug(categorySlug) : Promise.resolve(null),
  ]);

  const publishedWhere: Prisma.BlogPostWhereInput = {
    publishedAt: { not: null },
    ...(activeCategory ? { categoryId: activeCategory.id } : {}),
  };

  const db = getDb();
  const [totalCount, posts] = await Promise.all([
    db.blogPost.count({ where: publishedWhere }),
    db.blogPost.findMany({
      where: publishedWhere,
      orderBy: { publishedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
        views: true,
        likes: true,
        readingTimeMinutes: true,
        authorName: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const featured = currentPage === 1 && posts.length > 0 ? posts[0] : null;
  const gridPosts = currentPage === 1 && featured ? posts.slice(1) : posts;
  const featuredMeta = featured ? getBlogCardMeta(featured.category?.slug, 0) : null;

  return (
    <main style={{ background: "var(--surface-page)" }}>
      <section
        style={{
          padding: "clamp(40px, 6vw, 72px) 0 clamp(28px, 4vw, 44px)",
          background: "radial-gradient(120% 80% at 82% -20%, var(--color-primary-subtle) 0%, transparent 55%), var(--surface-page)",
        }}
      >
        <div className="fk-container">
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Блог" }]} />
          <div style={{ marginTop: "22px" }}>
            <span className="fk-eyebrow">Блог</span>
            <h1
              style={{
                marginTop: "12px",
                maxWidth: "16ch",
                font: "var(--fw-extra) clamp(2.2rem, 5vw, 3.2rem)/1.08 var(--font-display)",
                color: "var(--text-strong)",
                letterSpacing: "-0.03em",
                textWrap: "balance",
              }}
            >
              {activeCategory ? activeCategory.name : "Полезные статьи о QR-кодах"}
            </h1>
            <p style={{ marginTop: "16px", maxWidth: "52ch", font: "var(--fw-regular) clamp(1rem, 2vw, 1.15rem)/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
              Гайды, кейсы и разборы аналитики: как выбрать тип кода, измерить офлайн-рекламу и не потерять ни одного сканирования.
            </p>
            <BlogCategoryChips categories={categories} activeSlug={activeCategory?.slug} />
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "clamp(32px, 5vw, 56px)" }}>
        <div className="fk-container">
          {posts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl" style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)" }}>
              {activeCategory ? `В категории «${activeCategory.name}» пока нет статей.` : "Пока нет опубликованных статей."}
            </div>
          ) : (
            featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="qrs-card-lift qrs-featured-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.05fr 0.95fr",
                  gap: 0,
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ position: "relative", minHeight: "300px", background: featuredMeta?.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ position: "absolute", top: "20px", left: "20px", padding: "6px 14px", borderRadius: "999px", background: "var(--color-accent)", color: "#fff", font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.04em" }}>
                    РЕКОМЕНДУЕМ
                  </span>
                  {featured.coverImageUrl ? (
                    <Image src={featured.coverImageUrl} alt={featured.title} fill className="object-cover" priority sizes="(max-width:900px) 100vw, 50vw" />
                  ) : (
                    <BlogCardIcon type={featuredMeta?.icon ?? "qr"} size={88} />
                  )}
                </div>
                <div style={{ padding: "clamp(28px, 4vw, 44px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: featuredMeta?.color }}>
                      {featured.category?.name ?? "Статья"}
                    </span>
                    <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--text-subtle)" }} />
                    {featured.readingTimeMinutes != null && (
                      <span style={{ font: "var(--fw-medium) 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                        {featured.readingTimeMinutes} минут чтения
                      </span>
                    )}
                  </div>
                  <h2 style={{ marginTop: "14px", font: "var(--fw-bold) clamp(1.5rem, 3vw, 2rem)/1.2 var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)", textWrap: "balance" }}>
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p style={{ marginTop: "14px", font: "var(--fw-regular) 1rem/1.65 var(--font-sans)", color: "var(--text-muted)" }}>
                      {featured.excerpt}
                    </p>
                  )}
                  <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ width: "40px", height: "40px", borderRadius: "999px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", font: "var(--fw-bold) 14px/1 var(--font-sans)" }}>
                      {(featured.authorName ?? "QR").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "QR"}
                    </span>
                    <div>
                      <div style={{ font: "var(--fw-semibold) 14px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>
                        {featured.authorName ?? "Редакция QR-S"}
                      </div>
                      <div style={{ font: "var(--fw-regular) 12px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                        {featured.publishedAt ? formatPostDate(featured.publishedAt) : "Блог QR-S"}
                      </div>
                    </div>
                    <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "7px", font: "var(--fw-semibold) 14px/1 var(--font-sans)", color: "var(--color-primary)" }}>
                      Читать
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      {gridPosts.length > 0 && (
        <section style={{ paddingBottom: "var(--section-y)" }}>
          <div className="fk-container">
            <h2 style={{ font: "var(--fw-bold) clamp(1.4rem, 3vw, 1.9rem)/1.2 var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)", marginBottom: "28px" }}>
              Свежие статьи
            </h2>
            <div className="qrs-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "24px" }}>
              {gridPosts.map((post, index) => {
                const meta = getBlogCardMeta(post.category?.slug, index);
                return (
                  <article
                    key={post.slug}
                    className="qrs-card-lift"
                    style={{ display: "flex", flexDirection: "column", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}
                  >
                    <Link href={`/blog/${post.slug}`} className="block">
                      {post.coverImageUrl ? (
                        <div className="relative" style={{ height: "168px", background: meta.bg }}>
                          <Image src={post.coverImageUrl} alt={post.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" priority={index < 2} />
                        </div>
                      ) : (
                        <div style={{ height: "168px", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <BlogCardIcon type={meta.icon} color={meta.color} />
                        </div>
                      )}
                      <div style={{ padding: "22px", display: "flex", flexDirection: "column", flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: meta.color }}>
                            {post.category?.name ?? "Статья"}
                          </span>
                          <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "var(--text-subtle)" }} />
                          {post.readingTimeMinutes != null && (
                            <span style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                              {post.readingTimeMinutes} мин
                            </span>
                          )}
                        </div>
                        <h3 style={{ marginTop: "10px", font: "var(--fw-bold) 1.1rem/1.35 var(--font-display)", color: "var(--text-strong)", textWrap: "balance" }}>{post.title}</h3>
                        {post.excerpt && (
                          <p style={{ marginTop: "8px", font: "var(--fw-regular) 0.9rem/1.55 var(--font-sans)", color: "var(--text-muted)", flex: 1 }}>
                            {post.excerpt}
                          </p>
                        )}
                        <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <time dateTime={post.publishedAt!.toISOString()} style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-subtle)" }}>
                            {formatPostDate(post.publishedAt!)}
                          </time>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", font: "var(--fw-semibold) 13px/1 var(--font-sans)", color: "var(--color-primary)" }}>
                            Читать
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            <BlogPagination currentPage={currentPage} totalPages={totalPages} category={activeCategory?.slug} />
          </div>
        </section>
      )}

      <NewsletterBlock />
    </main>
  );
}
