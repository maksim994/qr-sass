import { cookies } from "next/headers";

export const WORKSPACE_COOKIE = "qr_workspace_id";

export type MembershipWithWorkspace = {
  id: string;
  role: string;
  workspaceId: string;
  createdAt?: Date;
  workspace: { id: string; name: string; plan: string };
};

/** Returns workspace from cookie if valid for user, else most recently joined (prioritizes invited workspaces) */
export async function selectWorkspace(
  memberships: MembershipWithWorkspace[]
): Promise<MembershipWithWorkspace["workspace"] | null> {
  if (!memberships.length) return null;
  const ids = new Set(memberships.map((m) => m.workspaceId));
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (selectedId && ids.has(selectedId)) {
    const m = memberships.find((x) => x.workspaceId === selectedId);
    return m?.workspace ?? memberships[0].workspace;
  }
  const byNewest = [...memberships].sort(
    (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0)
  );
  return byNewest[0]?.workspace ?? memberships[0].workspace;
}
