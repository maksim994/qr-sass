import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashResetToken } from "@/lib/password-reset";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import {
  consumeRateLimit,
  getClientIp,
  resetPasswordRateLimiter,
} from "@/lib/rate-limit";
export async function POST(req: Request) {
  const limit = await consumeRateLimit(
    resetPasswordRateLimiter,
    `verify:${getClientIp(req)}`,
  );
  if (!limit.success)
    return apiError(MSG.TOO_MANY_REQUESTS, "RATE_LIMITED", 429);
  const parsed = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
    .safeParse(await readJsonBody(req));
  if (!parsed.success)
    return apiError(MSG.EMAIL_VERIFICATION_INVALID, "VALIDATION_ERROR", 400);
  const now = new Date();
  const confirmed = await getDb().$transaction(async (tx) => {
    const row = await tx.emailVerificationToken.findUnique({
      where: { tokenHash: hashResetToken(parsed.data.token) },
    });
    if (!row || row.usedAt || row.expiresAt <= now) return false;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${row.userId} FOR UPDATE`;
    const used = await tx.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (!used.count) return false;
    const user = await tx.user.updateMany({
      where: { id: row.userId, email: row.email },
      data: { emailVerifiedAt: now },
    });
    return user.count === 1;
  });
  return confirmed
    ? apiSuccess({ message: MSG.EMAIL_VERIFIED })
    : apiError(MSG.EMAIL_VERIFICATION_INVALID, "VALIDATION_ERROR", 400);
}
