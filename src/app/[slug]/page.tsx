import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeoPage, getSeoPages } from "@/lib/seo-content";
import { isScenarioLandingSlug } from "@/lib/scenario-landings";
import { landingMetadata } from "@/lib/landing-seo";
import { MarketingLanding } from "@/components/landing/marketing-landing";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getSeoPages().filter(page => !isScenarioLandingSlug(page.slug)).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  return landingMetadata(page);
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page || isScenarioLandingSlug(slug)) notFound();
  return <MarketingLanding page={page} />;
}
