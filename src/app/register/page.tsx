import { getPlan } from "@/lib/plans";
import { RegisterPageClient } from "./register-page-client";

export default async function RegisterPage() {
  const plan = await getPlan("FREE");

  return <RegisterPageClient planName={plan.name} features={plan.limitLabels} />;
}
