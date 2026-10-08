import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_NAME } from "@/lib/workspace-name";
import { recordBusinessEvent } from "@/lib/business-events";
import { FUNNEL_EVENTS, recordFunnelEvent } from "@/lib/funnel";

import { telegramSubject, canBindLegacyTelegram } from "@/lib/telegram-identity-rules";
export class TelegramIdentityConflict extends Error {}

/** Call only after Telegram's signature and age have been verified. */
export async function resolveTelegramIdentity(profile: { id: number; firstName?: string; lastName?: string }) {
  const subject = telegramSubject(profile.id), name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return getDb().$transaction(async tx => {
    // Serialize first login and legacy binding across all app instances.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`telegram:${subject}`}, 0))`;
    const identity = await tx.authIdentity.findUnique({ where: { provider_subject: { provider: "telegram", subject } }, include: { user: { include: { memberships: true } } } });
    if (identity) return identity.user;
    const email = `tg-${subject}@telegram.local`;
    const legacy = await tx.user.findUnique({ where: { email }, include: { memberships: true } });
    if (legacy && !canBindLegacyTelegram(legacy, subject)) throw new TelegramIdentityConflict();
    const user = legacy ?? await tx.user.create({ data: {
      email, name, passwordHash: "telegram-auth", emailVerifiedAt: new Date(),
      memberships: { create: { role: "OWNER", workspace: { create: { name: DEFAULT_WORKSPACE_NAME, slug: `tg-${subject}-${nanoid(8)}` } } } },
    }, include: { memberships: true } });
    await tx.authIdentity.create({ data: { provider: "telegram", subject, userId: user.id } });
    if (!legacy) {
      const workspaceId = user.memberships[0]?.workspaceId;
      if (workspaceId) await recordFunnelEvent({ name: FUNNEL_EVENTS.registration_completed, workspaceId, userId: user.id, source: "telegram", isTest: process.env.NODE_ENV !== "production", tx, throwOnError: true, oncePerWorkspace: true });
      await recordBusinessEvent(tx, { key: `registration:${user.id}`, name: "registration_completed", userId: user.id, workspaceId, isTest: process.env.NODE_ENV !== "production", payload: { source: "telegram" } });
    }
    return user;
  }, { timeout: 20000 });
}
