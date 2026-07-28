import Link from "next/link";
import Image from "next/image";
import { getBlogCardMeta } from "@/lib/blog-card-meta";
import { BlogCardIcon } from "@/components/blog/blog-card-icon";

type RelatedPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  readingTimeMinutes: number | null;
  category?: { slug: string; name: string } | null;
};

export function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section>
      <h2 style={{ font: "var(--fw-bold) clamp(1.4rem, 3vw, 1.9rem)/1.2 var(--font-display)", letterSpacing: "-0.02em", color: "var(--text-strong)", marginBottom: "28px" }}>
        Читайте также
      </h2>
      <div className="qrs-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "24px" }}>
        {posts.map((post, index) => {
          const meta = getBlogCardMeta(post.category?.slug, index);
          return (
          <article
            key={post.slug}
            className="qrs-card-lift"
            style={{ display: "flex", flexDirection: "column", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}
          >
            <Link href={`/blog/${post.slug}`} className="block">
              {post.coverImageUrl ? (
                <div className="relative" style={{ height: "152px", background: "var(--surface-subtle)" }}>
                  <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                </div>
              ) : (
                <div style={{ height: "152px", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BlogCardIcon type={meta.icon} color={meta.color} />
                </div>
              )}
              <div style={{ padding: "22px" }}>
                <span style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: meta.color }}>
                  {post.category?.name ?? "Статья"}
                </span>
                <h3 style={{ marginTop: "10px", font: "var(--fw-bold) 1.1rem/1.35 var(--font-display)", color: "var(--text-strong)", textWrap: "balance" }}>
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p style={{ marginTop: "8px", font: "var(--fw-regular) 0.9rem/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
                    {post.excerpt}
                  </p>
                )}
                <span className="qrs-navlink" style={{ display: "inline-flex", marginTop: "14px", fontSize: "var(--fs-sm)" }}>
                  Читать →
                </span>
              </div>
            </Link>
          </article>
          );
        })}
      </div>
    </section>
  );
}
