import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { userNeedsConsentRenewal } from "@/lib/legal-consent";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  if (await userNeedsConsentRenewal(user.id)) {
    redirect("/consent/renew");
  }

  return <AdminShell user={{ email: user.email }}>{children}</AdminShell>;
}
