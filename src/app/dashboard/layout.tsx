import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

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

  return (
    <DashboardShell
      user={{ email: user.email, isAdmin: !!user.isAdmin }}
      workspace={{ id: workspace.id, name: workspace.name, plan: workspace.plan }}
      workspaces={user.memberships.map((m) => m.workspace)}
    >
      {children}
    </DashboardShell>
  );
}
