import { randomUUID } from 'node:crypto';
import type { QrCode } from '@prisma/client';
import { getDb } from '@/lib/db';
import { getRedis } from '@/lib/redis';
import { env } from '@/lib/env';
import { auditQr, qrUrls } from '@/lib/abuse/moderation';
import { checkUrlBatch, checkForQr, type CheckResult } from '@/lib/abuse/url-check';
import { notifyAbuse } from '@/lib/abuse/reports';
export function recheckDecision(qr: Pick<QrCode, 'abuseLegacy'>, result: CheckResult) {
  const threat = result.sources.google === 'malicious' || result.sources.yandex === 'malicious';
  const localBlock = result.sources.blocklist === 'BLOCK';
  return { review: threat || !qr.abuseLegacy && localBlock, attention: !threat && (result.verdict === 'suspicious' || result.verdict === 'malicious') };
}
/** Provider quota exhaustion leaves lastCheckedAt unchanged, so the next run resumes. */
export async function recheckCodes(qrs: QrCode[], batch: Map<string, CheckResult>) {
  let flagged = 0, attention = 0, deferred = false;
  for (const snapshot of qrs) {
    const urls = qrUrls(snapshot);
    const result = await checkForQr(urls, snapshot.name, batch);
    if (result.deferred) deferred = true;
    const decision = recheckDecision(snapshot, result);
    await getDb().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${snapshot.id} FOR UPDATE`;
      const qr = await tx.qrCode.findUnique({ where: { id: snapshot.id } });
      // Never overwrite a concurrent edit or a manual moderation decision.
      if (!qr || +qr.updatedAt !== +snapshot.updatedAt || !['OK', 'PENDING_CHECK'].includes(qr.moderationStatus)) return;
      const updated = await tx.qrCode.update({ where: { id: qr.id }, data: {
        lastCheckedAt: result.deferred ? undefined : new Date(), lastCheckVerdict: result.verdict,
        moderationAttention: decision.attention, moderationReason: decision.attention || decision.review ? result.reasons.join('; ').slice(0, 2000) : undefined,
        moderationStatus: decision.review ? 'ON_MODERATION' : result.verdict === 'unknown' || result.deferred ? qr.moderationStatus : 'OK',
        moderationAt: decision.review || decision.attention ? new Date() : undefined,
      } });
      if (decision.review || decision.attention && !qr.moderationAttention) {
        await auditQr(tx, updated, { actorType: 'system' }, 'recheck_flag', qr);
        if (decision.review) flagged++; else attention++;
      }
    });
  }
  return { flagged, attention, deferred };
}
export async function runAbuseRecheck(full = false, now = new Date()) {
  if (!env.ABUSE_CHECK_ENABLED) return { skipped: true };
  const redis = getRedis();
  if (!redis) throw new Error('Abuse recheck requires Redis for its distributed lock');
  const token = randomUUID(), lock = 'abuse:recheck:lock';
  if (await redis.set(lock, token, 'EX', 120, 'NX') !== 'OK') return { skipped: true };
  let lockLost = false;
  const renew = setInterval(() => { void redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('expire',KEYS[1],120) else return 0 end", 1, lock, token).then(v => { if (v !== 1) lockLost = true; }).catch(() => { lockLost = true; }); }, 30000);
  try {
    const db = getDb(); let cursor: string | undefined, flagged = 0, attention = 0, deferred = false;
    const dayStart = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(now)}T00:00:00+03:00`);
    const seen = new Map<string, CheckResult>();
    for (;;) {
      if (lockLost) throw new Error('Abuse worker lost lock');
      const qrs = await db.qrCode.findMany({ where: { isArchived: false, moderationStatus: { in: full ? ['OK', 'PENDING_CHECK'] : ['PENDING_CHECK'] }, ...(full ? { OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: dayStart } }] } : { OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lte: new Date(+now - 600000) } }] }) }, orderBy: { id: 'asc' }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      if (!qrs.length) break;
      cursor = qrs.at(-1)!.id;
      const urls = [...new Set(qrs.flatMap(qrUrls))].filter(url => !seen.has(url));
      for (let offset = 0; offset < urls.length; offset += 500) {
        const checked = await checkUrlBatch(urls.slice(offset, offset + 500));
        for (const [url, result] of checked) seen.set(url, result);
        if (offset + 500 < urls.length) await new Promise(resolve => setTimeout(resolve, env.ABUSE_RECHECK_BATCH_DELAY_MS));
      }
      if (lockLost) throw new Error('Abuse worker lost lock');
      const result = await recheckCodes(qrs, seen); flagged += result.flagged; attention += result.attention; deferred ||= result.deferred;
      if (deferred) break;
      await new Promise(resolve => setTimeout(resolve, env.ABUSE_RECHECK_BATCH_DELAY_MS));
    }
    if (flagged || attention) await db.$transaction(tx => notifyAbuse(tx, `recheck:${token}`, `Перепроверка: ${flagged} кодов на модерации; ${attention} требуют внимания`));
    return { flagged, attention, deferred };
  } finally { clearInterval(renew); await redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", 1, lock, token).catch(() => undefined); }
}
