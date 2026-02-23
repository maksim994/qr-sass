import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-response";

/** Returns membership if user is OWNER or ADMIN of the workspace, else null */
export async function getWorkspaceAdminOrNull(workspaceId: string) {
  const session = await getSession();
  if (!session?.sub) return null;

  const db = getDb();
  const membership = await db.membership.findFirst({
    where: {
      userId: session.sub,
      workspaceId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: { workspace: true },
  });
  return membership;
}
