import { getPlan } from "@/lib/plans";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { RegisterPageClient } from "./register-page-client";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const plan = await getPlan("FREE");
  const nextPath = safePostAuthPath((await searchParams).next, "/dashboard");

  return <RegisterPageClient planName={plan.name} features={plan.limitLabels} nextPath={nextPath} />;
}
