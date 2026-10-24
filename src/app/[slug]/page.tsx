import type { Metadata } from "next";
import { getSearchLanding, searchLandings } from "@/lib/search-landings";
import { SearchLanding } from "@/components/landing/search-landing";
import { notFound } from "next/navigation";
import { getSeoPage, getSeoPages } from "@/lib/seo-content";
import { isScenarioLandingSlug } from "@/lib/scenario-landings";
import { landingMetadata } from "@/lib/landing-seo";
import { MarketingLanding } from "@/components/landing/marketing-landing";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [...searchLandings.map(({slug})=>({slug})), ...getSeoPages().filter(page => !isScenarioLandingSlug(page.slug)).filter(page=>!getSearchLanding(page.slug)).map(({ slug }) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const searchPage = getSearchLanding(slug);
  if (searchPage) return landingMetadata({ ...searchPage, keywords: [], noindex: searchPage.noindex });
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  return landingMetadata(page);
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const searchPage = getSearchLanding(slug);
  if (searchPage) return <SearchLanding page={searchPage}/>;
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  return <MarketingLanding page={page} />;
}
