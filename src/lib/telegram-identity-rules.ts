export function telegramSubject(id: unknown): string {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid Telegram subject");
  return String(id);
}
export function canBindLegacyTelegram(user: { email: string; passwordHash: string; emailVerifiedAt: Date | null }, subject: string) {
  return user.email === `tg-${subject}@telegram.local` && user.passwordHash === "telegram-auth" && user.emailVerifiedAt !== null;
}

