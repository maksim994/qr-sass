import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Команда</h1>
        <p className="mt-1 text-sm text-slate-500">
          Участники рабочей области. Тариф: {planInfo.name} — {planInfo.limits.maxUsers == null ? "неограниченно пользователей" : `до ${planInfo.limits.maxUsers}`}.
        </p>
      </div>

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
      />
    </div>
  );
}
