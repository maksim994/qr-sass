import { ResetPasswordClient } from "./reset-password-client";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <ResetPasswordClient token={token ?? ""} />;
}
