import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let isAdmin = false;
  if (session?.sub) {
    try {
      const { getDb } = await import("@/lib/db");
      const user = await getDb().user.findUnique({ where: { id: session.sub } });
      isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader session={session} isAdmin={isAdmin} />
      {children}
      <SiteFooter session={session} />
    </div>
  );
}
