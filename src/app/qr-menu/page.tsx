import { applySeoOverridesToMetadata } from "@/lib/seo-page-overrides";
import { landingMetadata } from "@/lib/landing-seo";
import { getSearchLanding } from "@/lib/search-landings";
import { SearchLanding } from "@/components/landing/search-landing";
const page = getSearchLanding("qr-menu")!;
export const dynamic = "force-dynamic";
export async function generateMetadata() { return applySeoOverridesToMetadata("/qr-menu", landingMetadata({...page, keywords:[]})); }
export default function QrMenuPage(){return <SearchLanding page={page}/>;}
