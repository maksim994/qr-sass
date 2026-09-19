import { landingMetadata } from "@/lib/landing-seo";
import { scenarioLandings } from "@/lib/scenario-landings";
import { ScenarioLanding } from "@/components/landing/scenario-landing";

const page = scenarioLandings["qr-menu"];
export const metadata = landingMetadata(page);

export default function QrMenuPage() {
  return <ScenarioLanding page={page} />;
}
