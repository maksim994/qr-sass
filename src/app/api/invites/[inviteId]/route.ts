import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { MSG } from "@/lib/user-messages";
import { inviteAcceptBlock, normalizeInviteEmail } from "@/lib/workspace-invite";

type RouteContext = { params: Promise<{ inviteId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const requestId = getRequestId(req);
  const session = await getSession();
  if (!session?.sub) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const body = await readJsonBody<{ action?: string }>(req);
  if (body?.action !== "accept" && body?.action !== "decline") {
    return apiError(MSG.INVALID_JSON, "BAD_REQUEST", 400, undefined, requestId);
  }

  const { inviteId } = await context.params;
  const db = getDb();
  const actor = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true },
  });
  if (!actor) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const preview = await db.workspaceInvite.findUnique({ where: { id: inviteId } });
  if (!preview || normalizeInviteEmail(preview.email) !== normalizeInviteEmail(actor.email)) {
    return apiError(MSG.INVITE_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
  }
  const entitlements = await getEntitlements(preview.workspaceId);
  const now = new Date();
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${preview.workspaceId} FOR UPDATE`;
      const invite = await tx.workspaceInvite.findUnique({ where: { id: inviteId } });
      if (!invite || normalizeInviteEmail(invite.email) !== normalizeInviteEmail(actor.email)) {
        throw Object.assign(new Error("missing"), { block: "email_mismatch" as const });
      }
      if (body.action === "decline") {
        if (invite.status !== "PENDING") throw Object.assign(new Error("closed"), { block: "not_pending" as const });
        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: { status: "DECLINED", respondedAt: now },
        });
        return { declined: true as const };
      }

      const [memberCount, existing] = await Promise.all([
        tx.membership.count({ where: { workspaceId: invite.workspaceId } }),
        tx.membership.findUnique({
          where: { userId_workspaceId: { userId: actor.id, workspaceId: invite.workspaceId } },
        }),
      ]);
      const block = inviteAcceptBlock({
        status: invite.status,
        expiresAt: invite.expiresAt,
        now,
        inviteEmail: invite.email,
        actorEmail: actor.email,
        memberCount,
        maxUsers: entitlements.plan.limits.maxUsers,
      });
      if (block) throw Object.assign(new Error(block), { block });
      if (!existing) {
        await tx.membership.create({
          data: { userId: actor.id, workspaceId: invite.workspaceId, role: "MEMBER" },
        });
      }
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", respondedAt: now },
      });
      return { accepted: true as const, workspaceId: invite.workspaceId };
    });
    return apiSuccess(result, 200, requestId);
  } catch (error) {
    const block = (error as { block?: string }).block;
    if (block === "email_mismatch") return apiError(MSG.INVITE_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    if (block === "expired") return apiError(MSG.INVITE_EXPIRED, "CONFLICT", 409, undefined, requestId);
    if (block === "user_limit") return apiError(MSG.USER_LIMIT_REACHED, "CONFLICT", 409, undefined, requestId);
    if (block === "not_pending") return apiError(MSG.INVITE_NOT_FOUND, "CONFLICT", 409, undefined, requestId);
    throw error;
  }
}
