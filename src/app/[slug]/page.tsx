import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoPage, getSeoPages } from "@/lib/seo-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const params: { slug: string }[] = [];
  for (const item of getSeoPages()) {
    params.push({ slug: item.slug });
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) {
    return {
      title: "Страница не найдена",
    };
  }
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical: `/${slug}`,
    },
  };
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Можно ли менять ссылку в QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да, динамические QR можно обновлять без перепечатки.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <article className="mx-auto max-w-4xl px-4 py-14">
        <header className="rounded-2xl border border-slate-200 bg-white p-7">
          <h1 className="text-3xl font-bold tracking-tight">{page.heading}</h1>
          <p className="mt-3 text-slate-600">{page.description}</p>
          <Link href="/register" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {page.cta}
          </Link>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {page.bullets.map((bullet) => (
            <div key={bullet} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {bullet}
            </div>
          ))}
        </section>

        <nav className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Похожие страницы</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {getSeoPages().map((item) => (
              <Link key={item.slug} href={`/${item.slug}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {item.title}
              </Link>
            ))}
          </div>
        </nav>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
