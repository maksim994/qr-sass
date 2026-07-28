import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSeoPage, getSeoPages } from "@/lib/seo-content";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

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

const baseUrl = process.env.APP_URL ?? "https://qr-s.ru";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) {
    return {
      title: "Страница не найдена",
    };
  }
  const url = `${baseUrl}/${slug}`;
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const session = await getSession();

  return (
    <div className="qrs-seo-landing">
      <SiteHeader session={session} />
      <main>
        <section className="qrs-seo-landing__hero">
          <div className="fk-container qrs-seo-landing__hero-inner">
            <span className="fk-eyebrow">QR-S.ru</span>
            <h1 className="qrs-seo-landing__title">{page.heading}</h1>
            <p className="qrs-seo-landing__description">{page.description}</p>
            <Button href="/register" variant="primary" size="lg">
              {page.cta}
            </Button>
          </div>
        </section>

        <section className="qrs-seo-landing__content">
          <div className="fk-container">
            <div className="qrs-seo-landing__grid">
              {page.bullets.map((bullet) => (
                <div key={bullet} className="qrs-seo-landing__bullet">
                  <span className="qrs-seo-landing__bullet-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <nav className="qrs-seo-landing__related" aria-label="Похожие страницы">
              <h2>Похожие страницы</h2>
              <div className="qrs-seo-landing__related-links">
                {getSeoPages().map((item) => (
                  <Link
                    key={item.slug}
                    href={`/${item.slug}`}
                    className={`qrs-seo-landing__related-link${item.slug === slug ? " qrs-seo-landing__related-link--active" : ""}`}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </section>
      </main>
      <SiteFooter session={session} />
    </div>
  );
}
