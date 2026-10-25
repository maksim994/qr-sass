import { Prisma } from "@prisma/client";
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { queueEmail } from '@/lib/email-notifications';
import { MSG } from '@/lib/user-messages';
import { auditQr, applyModeration, qrUrls, type AbuseActor } from '@/lib/abuse/moderation';
import { urlHash } from '@/lib/abuse/url-check';
import { AbuseError } from '@/lib/abuse/rate';
export const moderationSchema = z.object({ action: z.enum(['block', 'approve', 'unblock', 'rollback']), reason: z.enum(['phishing', 'malware', 'illegal_goods', 'fraud', 'other']).default('phishing') });
export async function moderateQr(id: string, input: z.infer<typeof moderationSchema>, actor: { id: string; email: string }, request?: Request) {
  return getDb().$transaction(async tx => {
    if (!(await tx.user.findUnique({ where: { id: actor.id }, select: { isAdmin: true } }))?.isAdmin) throw new AbuseError(MSG.FORBIDDEN);
    await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${id} FOR UPDATE`;
    const before = await tx.qrCode.findUnique({ where: { id } });
    if (!before) throw new AbuseError(MSG.NOT_FOUND, 404);
    const abuseActor: AbuseActor = { actorType: 'admin', userId: actor.id, request };
    let qr = before;
    if (input.action === 'rollback') {
      const revision = await tx.qrRevision.findFirst({ where: { qrCodeId: id, payloadSnapshot: { not: Prisma.DbNull } }, orderBy: { createdAt: 'desc' } });
      // Older releases have URL-only revisions; choose the latest different destination.
      const previous = revision?.payloadSnapshot ? revision : await tx.qrRevision.findFirst({ where: { qrCodeId: id, destinationUrl: { not: before.currentTargetUrl ?? '' } }, orderBy: { createdAt: 'desc' } });
      if (!previous) throw new AbuseError(MSG.ABUSE_NO_REVISION, 409);
      await tx.qrRevision.create({ data: { qrCodeId: id, changedById: actor.id, destinationUrl: before.currentTargetUrl, encodedContent: before.encodedContent, payloadSnapshot: before.payload ?? undefined } });
      qr = await tx.qrCode.update({ where: { id }, data: { currentTargetUrl: previous.destinationUrl, payload: previous.payloadSnapshot ?? { ...(before.payload as object ?? {}), url: previous.destinationUrl }, moderationStatus: 'OK' } });
      qr = await applyModeration(tx, qr, qrUrls(qr), abuseActor);
    } else {
      qr = await tx.qrCode.update({ where: { id }, data: { moderationStatus: input.action === 'block' ? 'BLOCKED' : 'OK', moderationReason: input.action === 'block' ? input.reason : null, moderationAttention: false, moderationAt: new Date(), lastCheckedAt: null } });
      if (input.action === 'approve') for (const url of qrUrls(qr)) await tx.abuseUrlApproval.upsert({ where: { urlHash: urlHash(url) }, create: { urlHash: urlHash(url), expiresAt: new Date(Date.now() + 7 * 86400000) }, update: { expiresAt: new Date(Date.now() + 7 * 86400000) } });
    }
    await auditQr(tx, qr, abuseActor, `moderation_${input.action}`, before);
    const audit = await tx.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityId: id, action: `moderation_${input.action}`, reason: input.reason, before: { status: before.moderationStatus, urls: qrUrls(before) }, after: { status: qr.moderationStatus, urls: qrUrls(qr) } } });
    await tx.abuseReport.updateMany({ where: { qrCodeId: id, status: { in: ['NEW', 'IN_REVIEW'] } }, data: { status: input.action === 'block' ? 'RESOLVED_BLOCKED' : 'RESOLVED_OK', resolvedBy: actor.id, resolvedAt: new Date() } });
    if (input.action === 'block' && before.moderationStatus !== 'BLOCKED') {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: before.createdById } });
      await queueEmail(tx, { key: `abuse-block:${audit.id}`, kind: 'abuse_blocked', to: owner.email, userId: owner.id, workspaceId: before.workspaceId,
        message: { subject: 'QR-код заблокирован — QR-S.ru', text: `Код "${before.name}" заблокирован за нарушение правил. Если это ошибка, ответьте на письмо или напишите на abuse@qr-s.ru.` } });
    }
    return qr;
  }, { timeout: 20000 });
}
export const ruleSchema = z.object({ kind: z.enum(['DOMAIN', 'STOPWORD', 'SHORTENER', 'ALLOW_DOMAIN']), value: z.string().trim().min(2).max(253).transform(v => v.toLowerCase()), action: z.enum(['BLOCK', 'REVIEW']).default('REVIEW'), note: z.string().trim().max(500).optional() });
export function normalizeRule(input: z.infer<typeof ruleSchema>) {
  if (input.kind === 'STOPWORD') return input;
  const url = new URL(`https://${input.value.replace(/^www\./, '')}`);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password || url.port) throw new AbuseError(MSG.INVALID_PAYLOAD, 400);
  return { ...input, value: url.hostname.replace(/\.$/, '') };
}
