import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);

  if (!workspace) {
    redirect("/register");
  }

  const entitlements = await getEntitlements(workspace.id);

  return (
    <DashboardShell
      user={{ email: user.email, isAdmin: !!user.isAdmin }}
      workspace={{ id: workspace.id, name: workspace.name, plan: entitlements.planId, planName: entitlements.plan.name }}
      workspaces={user.memberships.map((m) => m.workspace)}
    >
      {children}
    </DashboardShell>
  );
}
