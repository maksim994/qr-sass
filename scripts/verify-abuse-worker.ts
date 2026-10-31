import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb } from '../src/lib/db.ts';
import { getRedis } from '../src/lib/redis.ts';
import { prepareQrCreation, updateModeratedQr } from '../src/lib/abuse/moderation.ts';
import { moderateQr } from '../src/lib/abuse/admin.ts';
import { runAbuseRecheck } from '../src/lib/abuse/recheck.ts';
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.port !== '55439' || database.pathname !== '/qr_abuse_test' || process.env.REDIS_URL !== 'redis://127.0.0.1:56389') throw new Error('Worker fixture requires isolated local PostgreSQL and Redis');
const db = getDb(), redis = getRedis()!, run = randomUUID();
const user = await db.user.create({ data: { email: `worker-${run}@example.test`, passwordHash: 'unusable-fixture-password', isAdmin: true } });
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
  const originalFetch = globalThis.fetch;
  try {
    const heldUrl = `https://outage.example/${run}`;
    const prepared = await prepareQrCreation({ workspaceId: ws.id, createdById: user.id, name: 'Fresh held code', kind: 'DYNAMIC', contentType: 'URL', shortCode: `held-${run}`, encodedContent: `https://qr-s.ru/r/held-${run}`, currentTargetUrl: heldUrl, payload: { url: heldUrl } }, { actorType: 'user', userId: user.id });
    const held = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${ws.id} FOR UPDATE`;
      return prepared(tx);
    });
    assert.equal(held.moderationStatus, 'PENDING_CHECK'); assert.equal(held.holdUntilCheck, true);
    await runAbuseRecheck(false, new Date(Date.now() + 600001));
    const stillHeld = await db.qrCode.findUniqueOrThrow({ where: { id: held.id } });
    assert.equal(stillHeld.moderationStatus, 'PENDING_CHECK'); assert.equal(stillHeld.holdUntilCheck, true);
    // Full daily passes must also include pending codes that became due today.
    globalThis.fetch = async () => Response.json({});
    await runAbuseRecheck(true, new Date(Date.now() + 600001));
    const released = await db.qrCode.findUniqueOrThrow({ where: { id: held.id } });
    assert.equal(released.moderationStatus, 'OK'); assert.equal(released.holdUntilCheck, false);
    assert.equal(await db.qrAuditEvent.count({ where: { qrCodeId: held.id, action: 'moderation_approve' } }), 0);
    assert.equal(await db.qrAuditEvent.count({ where: { qrCodeId: held.id, action: 'recheck_release' } }), 1);
    assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } })).moderationStatus, 'ON_MODERATION');
    console.log('PASS fresh unknown code remains held until the scheduled worker receives clean, without releasing manual moderation');

    let providerCalls = 0;
    globalThis.fetch = async () => {
      providerCalls++;
      // NOWAIT fails immediately if the provider is accidentally called under a row lock.
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${held.id} FOR UPDATE NOWAIT`;
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${ws.id} FOR UPDATE NOWAIT`;
      });
      return Response.json({});
    };
    const newTarget = `https://before-lock.example/${run}`;
    const edited = await updateModeratedQr(held.id, { currentTargetUrl: newTarget }, { actorType: 'user', userId: user.id });
    assert.equal(edited.currentTargetUrl, newTarget); assert.equal(edited.moderationStatus, 'OK'); assert.equal(providerCalls, 1);
    // Ensure create and admin rollback also call providers before their transactions.
    const createReady = await prepareQrCreation({ workspaceId: ws.id, createdById: user.id, name: 'Preflight fixture', kind: 'DYNAMIC', contentType: 'URL', shortCode: `ready-${run}`, encodedContent: `https://qr-s.ru/r/ready-${run}`, currentTargetUrl: `https://create-before-lock.example/${run}`, payload: {} }, { actorType: 'user', userId: user.id });
    const ready = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${ws.id} FOR UPDATE`;
      return createReady(tx);
    });
    assert.equal(ready.moderationStatus, 'OK'); assert.equal(ready.holdUntilCheck, false);
    assert.equal(providerCalls, 2);
    const rollbackTarget = `https://rollback-before-lock.example/${run}`;
    await db.qrRevision.create({ data: { qrCodeId: held.id, changedById: user.id, destinationUrl: rollbackTarget, encodedContent: held.encodedContent, payloadSnapshot: { url: rollbackTarget } } });
    const restored = await moderateQr(held.id, { action: 'rollback', reason: 'other' }, user);
    assert.equal(restored.currentTargetUrl, rollbackTarget); assert.equal(restored.moderationStatus, 'OK'); assert.equal(restored.holdUntilCheck, false);
    assert.equal(providerCalls, 3);
    console.log('PASS provider I/O runs before QR/workspace locks for create, update and rollback');

    globalThis.fetch = async () => {
      // Archive while the provider is responding: the locked re-read must reject the write.
      await db.qrCode.update({ where: { id: held.id }, data: { isArchived: true } });
      return Response.json({});
    };
    const beforeRace = await db.qrCode.findUniqueOrThrow({ where: { id: held.id } });
    await assert.rejects(updateModeratedQr(held.id, { currentTargetUrl: `https://archive-race.example/${run}` }, { actorType: 'api_key', userId: user.id }, { workspaceId: ws.id, requireActive: true }), error => (error as { status?: number }).status === 404);
    const afterRace = await db.qrCode.findUniqueOrThrow({ where: { id: held.id } });
    assert.equal(afterRace.isArchived, true); assert.equal(afterRace.currentTargetUrl, beforeRace.currentTargetUrl);
    assert.equal(await db.qrAuditEvent.count({ where: { qrCodeId: held.id, newUrls: { array_contains: [`https://archive-race.example/${run}`] } } }), 0);
    console.log('PASS v1 mutation scope rejects archiving between provider check and transaction');
  } finally { globalThis.fetch = originalFetch; }
  console.log('PASS Redis lock excludes concurrent workers, exhausted quota preserves pending URLs, next run resumes, one summary notification and lock released');
} finally {
  await db.workspace.delete({ where: { id: ws.id } }); await db.user.delete({ where: { id: user.id } }); await db.qrAuditEvent.deleteMany({ where: { workspaceId: ws.id } });
  await db.notificationOutbox.deleteMany({ where: { eventName: 'abuse_alert' } }); await db.telegramSettings.deleteMany({ where: { chatId: 'local-fixture' } });
  await db.$disconnect(); await redis.quit();
}
