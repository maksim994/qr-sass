import { landingMetadata } from "@/lib/landing-seo";
import { getSearchLanding } from "@/lib/search-landings";
import { SearchLanding } from "@/components/landing/search-landing";
const page = getSearchLanding("qr-menu")!;
export const dynamic = "force-dynamic";
export const metadata = landingMetadata({...page, keywords:[]});
export default function QrMenuPage(){return <SearchLanding page={page}/>;}
