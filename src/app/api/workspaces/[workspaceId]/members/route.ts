import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getEntitlements } from "@/lib/entitlements";
import { z } from "zod";
import { consumeRateLimit, getClientIp, inviteRateLimiter } from "@/lib/rate-limit";
import {
  inviteCreateBlock,
  inviteExpiresAt,
  normalizeInviteEmail,
} from "@/lib/workspace-invite";

function inviteError(block: NonNullable<ReturnType<typeof inviteCreateBlock>>, requestId: string) {
  if (block === "already_member") return apiError(MSG.MEMBER_ALREADY_IN_TEAM, "CONFLICT", 409, undefined, requestId);
  if (block === "already_invited") return apiError(MSG.MEMBER_INVITE_PENDING, "CONFLICT", 409, undefined, requestId);
  return apiError(MSG.USER_LIMIT_REACHED, "CONFLICT", 409, undefined, requestId);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const limit = await consumeRateLimit(inviteRateLimiter, `${membership.userId}:${getClientIp(req)}`);
  if (!limit.success) return apiError(MSG.TOO_MANY_INVITES, "VALIDATION_ERROR", 429, undefined, requestId);

  const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await readJsonBody(req));
  if (!parsed.success) {
    return apiError(MSG.EMAIL_REQUIRED, "VALIDATION_ERROR", 400, undefined, requestId);
  }
  const email = normalizeInviteEmail(parsed.data.email);

  const db = getDb();
  const invitedUser = await db.user.findUnique({ where: { email } });
  if (!invitedUser) {
    return apiError(MSG.MEMBER_NOT_REGISTERED, "NOT_FOUND", 404, undefined, requestId);
  }

  const now = new Date();
  // Resolve expired subscriptions before taking the workspace lock: entitlements
  // may acquire the same lock in its own transaction.
  const entitlements = await getEntitlements(workspaceId);
  try {
    const invite = await db.$transaction(async (tx) => {
      // Serialize seat reservations and acceptance for this workspace.
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const [existing, pending, memberCount, pendingCount] = await Promise.all([
        tx.membership.findUnique({
          where: { userId_workspaceId: { userId: invitedUser.id, workspaceId } },
        }),
        tx.workspaceInvite.findFirst({
          where: { workspaceId, email, status: "PENDING", expiresAt: { gt: now } },
        }),
        tx.membership.count({ where: { workspaceId } }),
        tx.workspaceInvite.count({
          where: { workspaceId, status: "PENDING", expiresAt: { gt: now } },
        }),
      ]);
      const block = inviteCreateBlock({
        alreadyMember: Boolean(existing),
        pendingInvite: Boolean(pending),
        memberCount,
        pendingCount,
        maxUsers: entitlements.plan.limits.maxUsers,
      });
      if (block) throw Object.assign(new Error(block), { block });
      return tx.workspaceInvite.create({
        data: {
          workspaceId,
          email,
          invitedByUserId: membership.userId,
          expiresAt: inviteExpiresAt(now),
        },
        select: { id: true, email: true, expiresAt: true },
      });
    });
    return apiSuccess({ inviteId: invite.id, email: invite.email, expiresAt: invite.expiresAt }, 200, requestId);
  } catch (error) {
    const block = (error as { block?: ReturnType<typeof inviteCreateBlock> }).block;
    if (block) return inviteError(block, requestId);
    throw error;
  }
}
