export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type InviteBlock =
  | "already_member"
  | "already_invited"
  | "user_limit"
  | "expired"
  | "not_pending"
  | "email_mismatch";

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function inviteExpiresAt(now: Date) {
  return new Date(now.getTime() + INVITE_TTL_MS);
}

export function seatsAllowAnother(memberCount: number, pendingCount: number, maxUsers: number | null) {
  if (maxUsers === null) return true;
  return memberCount + pendingCount < maxUsers;
}

export function inviteCreateBlock(input: {
  alreadyMember: boolean;
  pendingInvite: boolean;
  memberCount: number;
  pendingCount: number;
  maxUsers: number | null;
}): InviteBlock | null {
  if (input.alreadyMember) return "already_member";
  if (input.pendingInvite) return "already_invited";
  if (!seatsAllowAnother(input.memberCount, input.pendingCount, input.maxUsers)) return "user_limit";
  return null;
}

export function inviteAcceptBlock(input: {
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";
  expiresAt: Date;
  now: Date;
  inviteEmail: string;
  actorEmail: string;
  memberCount: number;
  maxUsers: number | null;
}): InviteBlock | null {
  if (normalizeInviteEmail(input.inviteEmail) !== normalizeInviteEmail(input.actorEmail)) return "email_mismatch";
  if (input.status !== "PENDING") return "not_pending";
  if (input.expiresAt.getTime() <= input.now.getTime()) return "expired";
  if (input.maxUsers !== null && input.memberCount >= input.maxUsers) return "user_limit";
  return null;
}
