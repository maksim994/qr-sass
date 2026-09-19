import crypto from "node:crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Mailbox proof is the reset link. Telegram-only accounts have no local password. */
export function canIssuePasswordReset(
  user: { passwordHash: string } | null | undefined,
): user is { passwordHash: string } {
  return Boolean(user && user.passwordHash !== "telegram-auth");
}
