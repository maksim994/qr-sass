import { getPlan } from "@/lib/plans";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { RegisterPageClient } from "./register-page-client";
import { isYandexAuthConfigured } from "@/lib/yandex-auth-config";
import { legacyQrIntentPath } from "@/lib/qr-draft";

type Props = {
  searchParams: Promise<{ next?: string; kind?: string; plan?: string; from?: string; intent?: string; type?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const plan = await getPlan("FREE");
  const query = await searchParams;
  const nextPath = safePostAuthPath(query.next ?? legacyQrIntentPath(query), query.plan === "pro" ? "/dashboard/billing?plan=pro&trial=1" : query.plan === "business" ? "/dashboard/billing?plan=business" : "/dashboard");
  const dynamicIntent = query.kind === "DYNAMIC" || query.plan === "pro" || /kind=DYNAMIC/i.test(nextPath);

  return <RegisterPageClient planName={plan.name} features={plan.limitLabels} nextPath={nextPath} dynamicIntent={dynamicIntent} staticIntent={nextPath.includes("/dashboard/create") && !dynamicIntent} yandexEnabled={isYandexAuthConfigured()} />;
}
