import { LoginPageClient } from "./login-page-client";
import { safePostAuthPath } from "@/lib/safe-redirect";

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;
  const nextPath = safePostAuthPath(next, "/dashboard");
  return <LoginPageClient initialError={error ?? ""} nextPath={nextPath} />;
}
