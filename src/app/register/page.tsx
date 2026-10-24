import { getPlan } from "@/lib/plans";
import { RegisterPageClient } from "./register-page-client";

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const plan = await getPlan("FREE");
  const { from } = await searchParams;

  return (
    <RegisterPageClient
      planName={plan.name}
      features={plan.limitLabels}
      fromDownload={from === "download"}
    />
  );
}
