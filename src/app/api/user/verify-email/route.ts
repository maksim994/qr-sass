import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import { queueVerification } from "@/lib/email-notifications";
import { canEmail } from "@/lib/email-notification-policy";
export async function POST() {
  const session = await getSession();
  if (!session?.sub) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  const state = await getDb().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${session.sub} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: session.sub } });
    if (!user || !canEmail(user.email)) return "forbidden";
    if (user.emailVerifiedAt) return "verified";
    const recent = await tx.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) return "wait";
    await queueVerification(tx, user);
    return "sent";
  });
  if (state === "forbidden") return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
  if (state === "wait")
    return apiError(MSG.EMAIL_VERIFICATION_WAIT, "RATE_LIMITED", 429);
  return apiSuccess({
    message:
      state === "verified" ? MSG.EMAIL_VERIFIED : MSG.EMAIL_VERIFICATION_SENT,
  });
}
