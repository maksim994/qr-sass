import { landingMetadata } from "@/lib/landing-seo";
import { scenarioLandings } from "@/lib/scenario-landings";
import { ScenarioLanding } from "@/components/landing/scenario-landing";

const page = scenarioLandings["qr-for-packaging"];
export const metadata = landingMetadata(page);

export default function QrPackagingPage() {
  return <ScenarioLanding page={page} />;
}
