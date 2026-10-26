import { getEntitlements } from '@/lib/entitlements';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getDb } from '@/lib/db';
import { env } from '@/lib/env';
import { hashClientIp } from '@/lib/client-ip-hash';
import { getClientIp } from '@/lib/client-ip';
import { consumeRateLimit } from '@/lib/rate-limit';
import { MSG } from '@/lib/user-messages';
import { auditQr } from '@/lib/abuse/moderation';
import { reportRateLimiter, AbuseError } from '@/lib/abuse/rate';
export const reportReasons = { phishing: 'Фишинг', malware: 'Вредоносная ссылка', illegal_goods: 'Запрещённые товары', fraud: 'Мошенничество', other: 'Другое' } as const;
export const reportSchema = z.object({ code: z.string().regex(/^[\w-]{1,128}$/), reason: z.enum(['phishing', 'malware', 'illegal_goods', 'fraud', 'other']), comment: z.string().trim().max(2000).optional(), email: z.union([z.email(), z.literal('')]).optional(), consent: z.boolean().optional(), website: z.string().max(500).optional() }).refine(v => !v.email || v.consent === true);
export async function notifyAbuse(tx: Prisma.TransactionClient, key: string, text: string) {
  const config = await tx.telegramSettings.findUnique({ where: { id: 'default' } });
  if (!config?.enabled || !config.chatId || !config.tokenCipher) return;
  await tx.notificationOutbox.createMany({ data: { key: `abuse:${key}`, eventName: 'abuse_alert', text: `${text}\n${new URL('/admin/abuse', env.APP_URL)}`, chatId: config.chatId, revision: config.revision }, skipDuplicates: true });
}
export async function submitAbuseReport(request: Request, input: z.infer<typeof reportSchema>) {
  const ip = getClientIp(request);
  const limit = await consumeRateLimit(reportRateLimiter, ip);
  if (!limit.success) throw new AbuseError(MSG.TOO_MANY_REQUESTS, 429, limit.retryAfterMs);
  if (input.website) return; // Honeypot: indistinguishable success without database write.
  const ipHash = ip === 'unknown' ? undefined : hashClientIp(ip);
  const qr = await getDb().qrCode.findUnique({ where: { shortCode: input.code } });
  if (!qr) throw new AbuseError(MSG.NOT_FOUND, 404);
  const entitlements = await getEntitlements(qr.workspaceId);
  return getDb().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${qr.id} FOR UPDATE`;
    const report = await tx.abuseReport.create({ data: { shortCode: input.code, qrCodeId: qr.id, reason: input.reason, comment: input.comment, email: input.email || null, ipHash } });
    const distinct = await tx.abuseReport.findMany({ where: { qrCodeId: qr.id, createdAt: { gte: new Date(Date.now() - 86400000) }, ipHash: { not: null }, status: { in: ['NEW', 'IN_REVIEW'] } }, distinct: ['ipHash'], select: { ipHash: true } });
    const current = await tx.qrCode.findUniqueOrThrow({ where: { id: qr.id } });
    if (distinct.length >= env.ABUSE_REPORTS_THRESHOLD && !['BLOCKED', 'ON_MODERATION'].includes(current.moderationStatus) && !(current.moderationAttention && current.moderationReason === 'reports_threshold')) {
      const attentionOnly = current.abuseLegacy || entitlements.planId !== 'FREE';
      const updated = await tx.qrCode.update({ where: { id: qr.id }, data: { moderationStatus: attentionOnly ? current.moderationStatus : 'ON_MODERATION', holdUntilCheck: attentionOnly ? current.holdUntilCheck : false, moderationAttention: attentionOnly, moderationReason: 'reports_threshold', moderationAt: new Date() } });
      if (attentionOnly) await notifyAbuse(tx, `attention:${report.id}`, `Порог жалоб: ${input.code}. Требует внимания; переход сохранён.`);
      await auditQr(tx, updated, { actorType: 'system' }, 'moderation_reports', current);
    }
    await notifyAbuse(tx, report.id, `Жалоба: ${input.code}. Причина: ${reportReasons[input.reason]}`);
    return report.id;
  });
}
