import { OwnerOpenGoals } from "@/components/owner-open-goals";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { accessReminder } from "@/lib/access-reminder";
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

  const reminder = accessReminder(entitlements.status, entitlements.periodEnd);
  return (
    <DashboardShell
      user={{ email: user.email, isAdmin: !!user.isAdmin }}
      workspace={{ id: workspace.id, name: workspace.name, plan: entitlements.planId, planName: entitlements.plan.name, trialUsed: !!workspace.trialUsedAt }}
      workspaces={user.memberships.map((m) => m.workspace)}
    >
      <OwnerOpenGoals />
      {reminder && <Alert variant="info" title={reminder.title}><p>{reminder.text} Напечатанные QR продолжают работать; два бесплатных динамических кода можно менять без оплаты.</p><Link href="/dashboard/billing">Посмотреть условия и продлить →</Link></Alert>}
      {children}
    </DashboardShell>
  );
}
