import { cookies } from "next/headers";
import { ANALYTICS_OPTOUT_COOKIE } from "@/lib/analytics-policy";
import { ADVERTISING_OPTOUT_COOKIE } from "@/lib/cookie-consent";
/** A client can request a subset; server-visible refusals always take precedence. */
export async function conversionCategories(body: { analytics?: unknown; advertising?: unknown } | null) {
  const jar = await cookies();
  return {
    analytics: body?.analytics !== false && jar.get(ANALYTICS_OPTOUT_COOKIE)?.value !== "1",
    advertising: body?.advertising === true && jar.get(ADVERTISING_OPTOUT_COOKIE)?.value !== "1",
  };
}
