import { getDb } from "@/lib/db";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getPlan } from "@/lib/plans";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{ email: string }>(req);
  if (!data?.email?.trim()) {
    return apiError("email required.", "BAD_REQUEST", 400, undefined, requestId);
  }
  const email = data.email.trim().toLowerCase();

  const planInfo = await getPlan(membership.workspace.plan);
  const userLimit = planInfo.limits.maxUsers;
  if (userLimit !== null) {
    const current = await getDb().membership.count({ where: { workspaceId } });
    if (current >= userLimit) {
      return apiError("Достигнут лимит пользователей по тарифу.", "CONFLICT", 409, undefined, requestId);
    }
  }

  const db = getDb();
  const invitedUser = await db.user.findUnique({ where: { email } });
  if (!invitedUser) {
    return apiError("Пользователь с таким email не найден. Он должен сначала зарегистрироваться.", "NOT_FOUND", 404, undefined, requestId);
  }

  const existing = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: invitedUser.id, workspaceId } },
  });
  if (existing) {
    return apiError("Пользователь уже в команде.", "CONFLICT", 409, undefined, requestId);
  }

  await db.membership.create({
    data: {
      userId: invitedUser.id,
      workspaceId,
      role: "MEMBER",
    },
  });

  return apiSuccess({ userId: invitedUser.id, email: invitedUser.email });
}
