import type { Metadata } from "next";
import { getSearchLanding, searchLandings } from "@/lib/search-landings";
import { SearchLanding } from "@/components/landing/search-landing";
import { notFound } from "next/navigation";
import { getSeoPage, getSeoPages } from "@/lib/seo-content";
import { isScenarioLandingSlug } from "@/lib/scenario-landings";
import { landingMetadata } from "@/lib/landing-seo";
import { resolveSeoFieldsForPath } from "@/lib/seo-page-overrides";
import { MarketingLanding } from "@/components/landing/marketing-landing";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [...searchLandings.map(({slug})=>({slug})), ...getSeoPages().filter(page => !isScenarioLandingSlug(page.slug)).filter(page=>!getSearchLanding(page.slug)).map(({ slug }) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug}`;
  const searchPage = getSearchLanding(slug);
  if (searchPage) {
    const resolved = await resolveSeoFieldsForPath(path, {
      title: searchPage.title,
      description: searchPage.description,
      heading: searchPage.heading,
      noindex: Boolean(searchPage.noindex),
    });
    return landingMetadata({
      slug,
      title: resolved.title,
      description: resolved.description,
      keywords: [],
      noindex: resolved.noindex,
    });
  }
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  const resolved = await resolveSeoFieldsForPath(path, {
    title: page.title,
    description: page.description,
    heading: page.heading,
    noindex: false,
  });
  return landingMetadata({
    slug,
    title: resolved.title,
    description: resolved.description,
    keywords: page.keywords,
    noindex: resolved.noindex,
  });
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const searchPage = getSearchLanding(slug);
  if (searchPage) return <SearchLanding page={searchPage}/>;
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  return <MarketingLanding page={page} />;
}
