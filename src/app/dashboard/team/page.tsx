import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { TeamPageClient } from "./team-client";

export default async function TeamPage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const [members, planInfo] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    getPlan(workspace.plan),
  ]);

  const roleLabels: Record<string, string> = {
    OWNER: "Владелец",
    ADMIN: "Администратор",
    MEMBER: "Участник",
  };
  const canInvite = planInfo.limits.maxUsers === null || members.length < planInfo.limits.maxUsers;
  const myRole = members.find((m) => m.userId === user.id)?.role;
  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";
  const planLabel = `${planInfo.name} — ${
    planInfo.limits.maxUsers == null ? "неограниченно пользователей" : `до ${planInfo.limits.maxUsers}`
  }`;

  return (
    <div className="qrs-team-page-wrap">
      <DashboardPageHeader title="Команда" description={`Участники рабочей области. Тариф: ${planLabel}.`} />
      <TeamPageClient
        workspaceId={workspace.id}
        members={members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          roleLabel: roleLabels[m.role],
          isCurrentUser: m.userId === user.id,
        }))}
        canInvite={canInvite && isAdmin}
        isAdmin={!!isAdmin}
        planLabel={planInfo.name}
      />
    </div>
  );
}
