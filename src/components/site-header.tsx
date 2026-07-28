import { SiteHeaderClient } from "@/components/site-header-client";

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
};

export function SiteHeader({ session, isAdmin }: Props) {
  return <SiteHeaderClient session={session} isAdmin={isAdmin} />;
}
