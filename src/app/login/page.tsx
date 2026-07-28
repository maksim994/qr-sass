import { LoginPageClient } from "./login-page-client";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <LoginPageClient initialError={error ?? ""} />;
}
