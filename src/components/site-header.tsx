import { SiteHeaderClient } from "@/components/site-header-client";

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
  minimal?: boolean;
  createHref?: string;
};

export function SiteHeader({ session, isAdmin, minimal, createHref }: Props) {
  return <SiteHeaderClient session={session} isAdmin={isAdmin} minimal={minimal} createHref={createHref} />;
}
