import { readArchive } from "@/lib/workspace-plan";
import { recordBusinessEvent } from "@/lib/business-events";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";

const reason = z.string().trim().min(3).max(500);
export const adminRoleSchema = z.object({ isAdmin: z.boolean(), reason });
export const adminAccessSchema = z.object({
  plan: z.enum(["FREE", "PRO", "BUSINESS", "FRIENDS", "ARCHIVE"]),
  // An omitted date preserves an existing active paid period exactly.
  currentPeriodEnd: z.string().datetime({ offset: true }).optional(),
  reason,
});
export class AdminOperationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
type Actor = { id: string; email: string };
async function transaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDb().$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
}
async function assertActor(tx: Prisma.TransactionClient, actor: Actor) {
  const current = await tx.user.findUnique({
    where: { id: actor.id },
    select: { isAdmin: true },
  });
  if (!current?.isAdmin) throw new AdminOperationError(MSG.UNAUTHORIZED, 403);
}
export async function changeAdminRole(
  actor: Actor,
  userId: string,
  input: z.infer<typeof adminRoleSchema>,
) {
  return transaction(async (tx) => {
    await assertActor(tx, actor);
    const before = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isAdmin: true },
    });
    if (!before) throw new AdminOperationError(MSG.USER_NOT_FOUND, 404);
    if (before.isAdmin === input.isAdmin) return before;
    if (
      !input.isAdmin &&
      before.isAdmin &&
      (await tx.user.count({ where: { isAdmin: true } })) <= 1
    ) {
      throw new AdminOperationError(MSG.ADMIN_LAST_ADMIN, 409);
    }
    const after = await tx.user.update({
      where: { id: userId },
      data: { isAdmin: input.isAdmin },
      select: { id: true, email: true, name: true, isAdmin: true },
    });
    const audit = await tx.adminAuditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        entityId: userId,
        action: "admin_role",
        reason: input.reason,
        before,
        after,
      },
    });
    await recordBusinessEvent(tx, {
      key: `admin-role:${audit.id}`,
      name: "admin_role",
      userId,
      isTest: process.env.NODE_ENV !== "production",
    });
    return after;
  });
}
export async function changeWorkspaceAccess(
  actor: Actor,
  workspaceId: string,
  input: Omit<z.infer<typeof adminAccessSchema>, "plan"> & {
    plan?: "FREE" | "PRO" | "BUSINESS" | "FRIENDS" | "ARCHIVE";
  },
) {
  return transaction(async (tx) => {
    await assertActor(tx, actor);
    const before = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        plan: true,
        accessMode: true,
        archivedPlan: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });
    if (!before) throw new AdminOperationError(MSG.WORKSPACE_NOT_FOUND, 404);
    const selection = input.plan ?? (before.accessMode === "friends" ? "FRIENDS" : before.accessMode === "archive" ? "ARCHIVE" : before.plan);
    const archive = selection === "ARCHIVE"
      ? readArchive({ accessMode: "archive", archivedPlan: before.archivedPlan }) : null;
    const plan = selection === "FRIENDS" ? "BUSINESS" : selection === "ARCHIVE" ? archive!.plan.id : selection;
    const mode = selection === "FRIENDS" ? "friends" : selection === "ARCHIVE" ? "archive" : "standard";
    if (!input.plan && (plan === "FREE" || mode === "friends"))
      throw new AdminOperationError(MSG.FREE_PLAN_CHANGE_FIRST);
    const periodEnd = input.currentPeriodEnd
      ? new Date(input.currentPeriodEnd)
      : before.subscription?.currentPeriodEnd;
    // Preserving an archive without changing dates must not manufacture a paid period.
    const preserveArchive = mode === "archive" && !input.currentPeriodEnd;
    if (mode !== "friends" && !preserveArchive && plan !== "FREE" && (!periodEnd || periodEnd <= new Date()))
      throw new AdminOperationError(MSG.ADMIN_PERIOD_REQUIRED);
    await tx.workspace.update({ where: { id: workspaceId }, data: { plan, accessMode: mode } });
    if (mode === "friends") {
      // Historical subscription/payment rows are retained. Complimentary access
      // is evaluated independently, so late payments/expiry cannot downgrade it.
    } else if (preserveArchive) {
      await tx.subscription.updateMany({ where: { workspaceId }, data: { plan } });
    } else if (plan === "FREE") {
      await tx.subscription.updateMany({ where: { workspaceId },
        data: { plan: "FREE", status: "canceled", cancelAtPeriodEnd: false } });
    } else {
      await tx.subscription.upsert({
        where: { workspaceId },
        create: { workspaceId, plan, status: "active", currentPeriodEnd: periodEnd! },
        update: { plan, status: "active", currentPeriodEnd: periodEnd!, cancelAtPeriodEnd: false },
      });
    }
    const after = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: {
        id: true,
        plan: true,
        accessMode: true,
        archivedPlan: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        entityId: workspaceId,
        action: "workspace_access",
        reason: input.reason,
        before: JSON.parse(JSON.stringify(before)),
        after: JSON.parse(JSON.stringify(after)),
      },
    });
    return after;
  });
}
