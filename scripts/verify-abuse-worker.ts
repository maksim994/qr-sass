import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb } from '../src/lib/db.ts';
import { getRedis } from '../src/lib/redis.ts';
import { runAbuseRecheck } from '../src/lib/abuse/recheck.ts';
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.port !== '55439' || database.pathname !== '/qr_abuse_test' || process.env.REDIS_URL !== 'redis://127.0.0.1:56389') throw new Error('Worker fixture requires isolated local PostgreSQL and Redis');
const db = getDb(), redis = getRedis()!, run = randomUUID();
const user = await db.user.create({ data: { email: `worker-${run}@example.test`, passwordHash: 'unusable-fixture-password' } });
const ws = await db.workspace.create({ data: { name: 'Worker fixture', slug: `worker-${run}` } });
const url = `http://malware.testing.google.test/testing/malware/?run=${run}`;
const qr = await db.qrCode.create({ data: { workspaceId: ws.id, createdById: user.id, name: 'Worker fixture', kind: 'DYNAMIC', contentType: 'URL', shortCode: run, encodedContent: `https://qr-s.ru/r/${run}`, currentTargetUrl: url, payload: { url }, moderationStatus: 'PENDING_CHECK' } });
const quotaKey = `yandex:${new Date().toISOString().slice(0, 10)}`;
try {
  await db.telegramSettings.upsert({ where: { id: 'default' }, create: { enabled: true, tokenCipher: 'local-fixture-no-real-credential', chatId: 'local-fixture', revision: 1 }, update: { enabled: true, tokenCipher: 'local-fixture-no-real-credential', chatId: 'local-fixture' } });
  await redis.set('abuse:recheck:lock', 'fixture-other-worker', 'EX', 30);
  assert.equal((await runAbuseRecheck()).skipped, true); await redis.del('abuse:recheck:lock');
  await db.abuseProviderQuota.upsert({ where: { key: quotaKey }, create: { key: quotaKey, count: 9000 }, update: { count: 9000 } });
  const deferred = await runAbuseRecheck(); assert.equal(deferred.deferred, true);
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } })).lastCheckedAt, null);
  await db.abuseProviderQuota.update({ where: { key: quotaKey }, data: { count: 0 } });
  const resumed = await runAbuseRecheck(); assert.equal(resumed.flagged, 1);
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } })).moderationStatus, 'ON_MODERATION');
  assert.equal(await db.notificationOutbox.count({ where: { eventName: 'abuse_alert', text: { contains: 'Перепроверка' } } }), 1);
  assert.equal(await redis.get('abuse:recheck:lock'), null);
  console.log('PASS Redis lock excludes concurrent workers, exhausted quota preserves pending URLs, next run resumes, one summary notification and lock released');
} finally {
  await db.workspace.delete({ where: { id: ws.id } }); await db.user.delete({ where: { id: user.id } }); await db.qrAuditEvent.deleteMany({ where: { workspaceId: ws.id } });
  await db.notificationOutbox.deleteMany({ where: { eventName: 'abuse_alert' } }); await db.telegramSettings.deleteMany({ where: { chatId: 'local-fixture' } });
  await db.$disconnect(); await redis.quit();
}
