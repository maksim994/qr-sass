import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-email-client";
export const metadata: Metadata = {
  title: "Подтверждение email",
  robots: { index: false, follow: false },
};
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailClient token={token ?? ""} />;
}
