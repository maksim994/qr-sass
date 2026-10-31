import { applySeoOverridesToMetadata } from "@/lib/seo-page-overrides";
import { landingMetadata } from "@/lib/landing-seo";
import { scenarioLandings } from "@/lib/scenario-landings";
import { ScenarioLanding } from "@/components/landing/scenario-landing";

export const dynamic = "force-dynamic";

const page = scenarioLandings["qr-for-packaging"];
export async function generateMetadata() { return applySeoOverridesToMetadata("/qr-for-packaging", landingMetadata(page)); }

export default function QrPackagingPage() {
  return <ScenarioLanding page={page} />;
}
