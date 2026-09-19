import { MarketingLanding } from "@/components/landing/marketing-landing";
import { getSeoPage } from "@/lib/seo-content";
import type { ScenarioLanding as ScenarioLandingData } from "@/lib/scenario-landings";

export function ScenarioLanding({ page }: { page: ScenarioLandingData }) {
  return <MarketingLanding page={getSeoPage(page.slug)!} scenario={page} />;
}
