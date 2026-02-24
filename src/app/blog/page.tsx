import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Блог — qr-s.ru",
  description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
  openGraph: {
    title: "Блог — qr-s.ru",
    description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Блог — qr-s.ru",
    description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
  },
};

export default async function BlogListPage() {
  const db = getDb();
  const posts = await db.blogPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      views: true,
      likes: true,
      readingTimeMinutes: true,
    },
  });

  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm font-semibold text-blue-600">Блог</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Полезные статьи о QR-кодах
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Советы по использованию динамических QR, маркетингу и аналитике для бизнеса.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.length === 0 ? (
              <div className="col-span-full card p-12 text-center text-slate-500">
                Пока нет опубликованных статей.
              </div>
            ) : (
              posts.map((post, index) => (
                <article
                  key={post.slug}
                  className="card overflow-hidden transition hover:shadow-lg"
                >
                <Link href={`/blog/${post.slug}`} className="block">
                  {post.coverImageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-slate-100">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        priority={index === 0}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900">{post.title}</h2>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-slate-600">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <time dateTime={post.publishedAt!.toISOString()}>
                        {new Date(post.publishedAt!).toLocaleDateString("ru", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      {post.readingTimeMinutes != null && (
                        <span>· {post.readingTimeMinutes} мин</span>
                      )}
                      <span>· {post.views} просмотров</span>
                      {post.likes > 0 && (
                        <span className="inline-flex items-center gap-1">
                          · {post.likes}{" "}
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
