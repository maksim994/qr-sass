import { SiteHeaderClient } from "@/components/site-header-client";

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
  minimal?: boolean;
};

export function SiteHeader({ session, isAdmin, minimal }: Props) {
  return <SiteHeaderClient session={session} isAdmin={isAdmin} minimal={minimal} />;
}
