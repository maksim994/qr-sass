import { env } from '../src/lib/env.ts';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from '../src/lib/db.ts';
import { defaultQrStyle } from '../src/lib/qr-style-config.ts';
import { generateQrApiKey } from '../src/lib/qr-api-input.ts';
import { checkUrlBatch } from '../src/lib/abuse/url-check.ts';
import { recheckCodes } from '../src/lib/abuse/recheck.ts';
import { purgeExpiredAbuseIp } from '../src/lib/analytics-retention.ts';
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.port !== '55439' || database.pathname !== '/qr_abuse_test') throw new Error('Requires isolated qr_abuse_test database on localhost:55439');
const db = getDb(), run = randomUUID(), base = 'http://localhost:3119';
let checks = 0; const extraWorkspaceIds: string[] = [];
const passed = (text: string) => { checks++; console.log(`PASS ${text}`); };
const user = await db.user.create({ data: { email: `abuse-${run}@example.test`, passwordHash: 'unusable-fixture-password', emailVerifiedAt: new Date(), isAdmin: true, createdAt: new Date('2025-01-01') } });
const ws = await db.workspace.create({ data: { name: 'Abuse fixture', slug: `abuse-${run}`, plan: 'PRO', accessMode: 'friends', memberships: { create: { userId: user.id, role: 'OWNER' } } } });
const token = await new SignJWT({ sub: user.id, email: user.email, sv: 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET));
function headers(ip = '198.51.100.11') { return { Cookie: `qr_saas_session=${token}; csrf_token=fixture-csrf; qr_workspace_id=${ws.id}`, Origin: base, 'X-CSRF-Token': 'fixture-csrf', 'Content-Type': 'application/json', 'X-Forwarded-For': ip, 'User-Agent': 'qr-abuse-fixture' }; }
const call = (path: string, body: unknown, method = 'POST', ip?: string) => fetch(base + path, { method, headers: headers(ip), body: JSON.stringify(body), redirect: 'manual' });
const reportSubnet = randomInt(1, 254);
const reportIp = (n: number) => `198.18.${reportSubnet}.${n}`;
const bad = 'http://malware.testing.google.test/testing/malware/';
async function create(payload: Record<string, unknown> = { url: 'https://example.com/clean' }, type = 'URL', workspaceId = ws.id) {
  const response = await call('/api/qr', { workspaceId, kind: 'DYNAMIC', contentType: type, name: `fixture-${type}`, payload, style: { ...defaultQrStyle, quietZoneModules: 4 } });
  assert.equal(response.status, 200, await response.clone().text());
  const data = (await response.json()).data;
  return db.qrCode.findUniqueOrThrow({ where: { id: data.qrId } });
}
try {
  const clean = await create(); assert.equal(clean.moderationStatus, 'OK');
  const redirect = await fetch(`${base}/r/${clean.shortCode}`, { redirect: 'manual' }); assert.equal(redirect.status, 302); assert.equal(redirect.headers.get('Location'), 'https://example.com/clean');
  passed('clean code redirects 302 and keeps original destination');
  const malicious = await create({ url: bad }); assert.equal(malicious.moderationStatus, 'ON_MODERATION');
  for (const prefix of ['r', 'p', 'v', 'g']) { const response = await fetch(`${base}/${prefix}/${malicious.shortCode}`, { redirect: 'manual' }); assert.equal(response.status, 200); assert.equal(response.headers.get('Location'), null); assert.doesNotMatch(await response.text(), /malware\.testing/); }
  assert.equal(await db.scanEvent.count({ where: { qrCodeId: malicious.id } }), 0);
  passed('mocked Yandex threat blocks all public surfaces before rendering/scan');
  for (const [suffix, body] of [['/target', { targetUrl: bad }], ['/smart-redirect', { ios: bad }], ['/ab-test', { urlA: bad, urlB: 'https://example.com/b' }], ['/settings', { gdprPolicyUrl: bad }], ['', { payload: { url: bad } }]] as const) {
    const qr = await create(); const response = await call(`/api/qr/${qr.id}${suffix}`, body, 'PATCH'); assert.equal(response.status, 200, await response.clone().text());
    const after = await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } }); assert.equal(after.moderationStatus, 'ON_MODERATION');
    assert.ok(await db.qrRevision.findFirst({ where: { qrCodeId: qr.id, destinationUrl: qr.currentTargetUrl } }));
  }
  passed('all five session update endpoints moderate and retain previous revision');
  const generated = generateQrApiKey(); const key = await db.qrApiKey.create({ data: { workspaceId: ws.id, createdById: user.id, name: 'Abuse fixture', keyHash: generated.keyHash, keyPrefix: generated.keyPrefix, scopes: ['qr:read', 'qr:write', 'stats:read'] } });
  const apiHeaders = { Authorization: `Bearer ${generated.key}`, 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.15', 'User-Agent': 'qr-abuse-fixture' };
  const createdApi = await fetch(base + '/api/v1/qr', { method: 'POST', headers: apiHeaders, body: JSON.stringify({ name: 'API fixture', targetUrl: 'https://example.com/v1' }) }); assert.equal(createdApi.status, 201, await createdApi.clone().text());
  const apiQr = (await createdApi.json()).data; const changedApi = await fetch(base + `/api/v1/qr/${apiQr.id}`, { method: 'PATCH', headers: apiHeaders, body: JSON.stringify({ targetUrl: bad }) }); assert.equal(changedApi.status, 200); assert.equal((await changedApi.json()).data.moderationStatus, 'ON_MODERATION');
  assert.ok(await db.qrAuditEvent.findFirst({ where: { qrCodeId: apiQr.id, actorType: 'api_key', apiKeyId: key.id, action: 'update_url' } }));
  passed('Bearer v1 create/update use shared moderation and identify API key in audit');
  const archivedApi = await create({ url: 'https://example.com/archived-api' });
  await db.qrCode.update({ where: { id: archivedApi.id }, data: { isArchived: true } });
  const archivedResponse = await fetch(base + `/api/v1/qr/${archivedApi.id}`, { method: 'PATCH', headers: apiHeaders, body: JSON.stringify({ targetUrl: 'https://example.com/forbidden-edit' }) });
  assert.equal(archivedResponse.status, 404);
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: archivedApi.id } })).currentTargetUrl, archivedApi.currentTargetUrl);
  passed('PATCH v1 rejects archived QR without changing its target');
  const rollback = await create(); await call(`/api/qr/${rollback.id}/target`, { targetUrl: bad }, 'PATCH');
  const rolled = await call(`/api/admin/qr/${rollback.id}/moderation`, { action: 'rollback' }); assert.equal(rolled.status, 200, await rolled.clone().text());
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: rollback.id } })).currentTargetUrl, rollback.currentTargetUrl);
  assert.equal((await call(`/api/admin/qr/${malicious.id}/moderation`, { action: 'block' })).status, 200);
  for (const prefix of ['r', 'p', 'v', 'g']) { const response = await fetch(`${base}/${prefix}/${malicious.shortCode}`, { redirect: 'manual' }); assert.equal(response.status, 451, `${prefix}: ${await response.clone().text()}`); assert.equal(response.headers.get('Location'), null); }
  assert.equal((await call(`/api/qr/${malicious.id}/target`, { targetUrl: 'https://example.com/' }, 'PATCH')).status, 403);
  assert.equal(await db.emailOutbox.count({ where: { workspaceId: ws.id, kind: 'abuse_blocked' } }), 1);
  passed('admin rollback restores safe target; block gives 451 everywhere, rejects owner edits, queues one email');
  const complained = await create();
  const freeWs = await db.workspace.create({ data: { name: 'Free reports fixture', slug: `free-reports-${run}`, memberships: { create: { userId: user.id, role: 'OWNER' } } } });
  extraWorkspaceIds.push(freeWs.id);
  const freeReportQr = await create({ url: 'https://example.com/free-reports' }, 'URL', freeWs.id);
  const legacyReportQr = await create({ url: 'https://example.com/legacy-reports' }, 'URL', freeWs.id);
  await db.qrCode.update({ where: { id: legacyReportQr.id }, data: { abuseLegacy: true } });
  for (const qr of [complained, freeReportQr, legacyReportQr]) {
    for (let n = 1; n <= 3; n++) assert.equal((await call('/api/abuse/report', { code: qr.shortCode, reason: 'phishing' }, 'POST', reportIp(n))).status, 200);
    const after = await db.qrCode.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(after.moderationStatus, qr.id === freeReportQr.id ? 'ON_MODERATION' : 'OK');
    assert.equal(after.moderationAttention, qr.id !== freeReportQr.id);
  }
  await recheckCodes([await db.qrCode.findUniqueOrThrow({ where: { id: complained.id } })], new Map([['https://example.com/clean', { verdict: 'clean', reasons: [], sources: { yandex: 'clean' } }]]));
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: complained.id } })).moderationAttention, true);
  for (let n = 0; n < 5; n++) assert.equal((await call('/api/abuse/report', { code: clean.shortCode, reason: 'other' }, 'POST', reportIp(20))).status, 200);
  const limited = await call('/api/abuse/report', { code: clean.shortCode, reason: 'other' }, 'POST', reportIp(20)); assert.equal(limited.status, 429); assert.ok(limited.headers.get('Retry-After'));
  const hashes = await db.abuseReport.findMany({ where: { qrCodeId: complained.id } }); assert.ok(hashes.every(r => r.ipHash?.length === 64));
  assert.equal((await call('/api/abuse/report', { code: clean.shortCode, reason: 'other', email: 'a@example.com' }, 'POST', reportIp(21))).status, 400);
  passed('distinct IP report threshold, 6th report rate limit, consent and hashed-only reporter IP');
  for (const [path, method] of [['/api/qr', 'POST'], ['/api/qr/bulk', 'POST'], [`/api/qr/${clean.id}`, 'PATCH'], [`/api/qr/${clean.id}/target`, 'PATCH'], [`/api/qr/${clean.id}/smart-redirect`, 'PATCH'], [`/api/qr/${clean.id}/ab-test`, 'PATCH'], [`/api/qr/${clean.id}/settings`, 'PATCH'], [`/api/qr/${clean.id}/duplicate`, 'POST'], ['/api/v1/qr', 'POST']] as const) assert.equal((await fetch(base + path, { method, body: '{}' })).status, 401, path);
  passed('all anonymous QR writes return 401');
  const legacy = await create(); await db.qrCode.update({ where: { id: legacy.id }, data: { abuseLegacy: true } });
  const legacyQr = await db.qrCode.findUniqueOrThrow({ where: { id: legacy.id } });
  await recheckCodes([legacyQr], new Map([['https://example.com/clean', { verdict: 'malicious', reasons: ['DOMAIN:example.com'], sources: { blocklist: 'BLOCK' } }]]));
  const legacyAfter = await db.qrCode.findUniqueOrThrow({ where: { id: legacy.id } }); assert.equal(legacyAfter.moderationStatus, 'OK'); assert.equal(legacyAfter.moderationAttention, true);
  await recheckCodes([legacyAfter], new Map([['https://example.com/clean', { verdict: 'malicious', reasons: ['yandex:threat'], sources: { yandex: 'malicious' } }]]));
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: legacy.id } })).moderationStatus, 'ON_MODERATION');
  passed('legacy codes retain redirect for local BLOCK but stop on provider threat');
  const pending = await create({ url: 'https://outage.example/' }); assert.equal(pending.moderationStatus, 'PENDING_CHECK');
  assert.equal((await fetch(`${base}/r/${pending.shortCode}`, { redirect: 'manual' })).status, 302);
  passed('configured provider outage fails open for an established account');
  await db.user.update({ where: { id: user.id }, data: { createdAt: new Date() } });
  const fresh = await create({ url: 'https://outage.example/new-account' }); assert.equal(fresh.moderationStatus, 'PENDING_CHECK'); assert.equal(fresh.holdUntilCheck, true);
  for (const prefix of ['r', 'p', 'v', 'g']) {
    const heldResponse = await fetch(`${base}/${prefix}/${fresh.shortCode}`, { redirect: 'manual' });
    assert.equal(heldResponse.status, 200); assert.equal(heldResponse.headers.get('Location'), null); assert.doesNotMatch(await heldResponse.text(), /outage\.example/);
  }
  assert.equal(await db.scanEvent.count({ where: { qrCodeId: fresh.id } }), 0);
  const originalKey = env.YANDEX_SAFE_BROWSING_API_KEY; env.YANDEX_SAFE_BROWSING_API_KEY = randomUUID();
  let recoveryCalls = 0;
  const recovered = await checkUrlBatch(['https://outage.example/new-account'], { rules: [], ignoreCache: true, skipQuota: true, fetcher: async () => { recoveryCalls++; return Response.json({}); } });
  env.YANDEX_SAFE_BROWSING_API_KEY = originalKey; assert.equal(recoveryCalls, 1);
  await recheckCodes([fresh], recovered);
  const released = await db.qrCode.findUniqueOrThrow({ where: { id: fresh.id } });
  assert.equal(released.moderationStatus, 'OK'); assert.equal(released.holdUntilCheck, false);
  const restoredRedirect = await fetch(`${base}/r/${fresh.shortCode}`, { redirect: 'manual' });
  assert.equal(restoredRedirect.status, 302); assert.equal(restoredRedirect.headers.get('Location'), 'https://outage.example/new-account');
  assert.equal(await db.qrAuditEvent.count({ where: { qrCodeId: fresh.id, action: 'moderation_approve' } }), 0);
  await db.user.update({ where: { id: user.id }, data: { createdAt: new Date('2025-01-01') } });
  passed('provider outage pauses a fresh unpaid code; worker clean releases it without admin approval');
  const list = await create({ links: [{ title: 'Safe', url: 'https://example.com/list' }, { title: 'Unsafe', url: bad }] }, 'LINK_LIST');
  assert.equal(list.moderationStatus, 'ON_MODERATION');
  assert.equal((await call(`/api/admin/qr/${list.id}/moderation`, { action: 'approve' })).status, 200);
  const approvedList = await db.qrCode.findUniqueOrThrow({ where: { id: list.id } });
  await recheckCodes([approvedList], new Map([['https://example.com/list', { verdict: 'clean', reasons: [], sources: { yandex: 'clean' } }], [bad, { verdict: 'malicious', reasons: ['yandex:threat'], sources: { yandex: 'malicious' } }]]));
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: list.id } })).moderationStatus, 'ON_MODERATION');
  passed('one unsafe hosted link remains a provider threat despite clean siblings and manual local approval');
  const expiry = await create(); await db.qrCode.update({ where: { id: expiry.id }, data: { expireAt: new Date('2025-01-01') } }); assert.match((await fetch(`${base}/r/${expiry.shortCode}`, { redirect: 'manual' })).headers.get('Location')!, /expired/);
  const password = await create(); await db.qrCode.update({ where: { id: password.id }, data: { passwordHash: await bcrypt.hash('test-only-passphrase', 4) } }); assert.match(await (await fetch(`${base}/r/${password.shortCode}`)).text(), /Введите пароль/);
  const max = await create(); await db.qrCode.update({ where: { id: max.id }, data: { maxScans: 1, scanEvents: { create: {} } } }); assert.match((await fetch(`${base}/r/${max.shortCode}`, { redirect: 'manual' })).headers.get('Location')!, /expired/);
  passed('existing expiry, password and max-scans public contracts remain intact');
  assert.equal((await call(`/api/qr/${clean.id}`, {}, 'DELETE')).status, 200);
  for (const action of ['create', 'update_url', 'delete']) assert.ok(await db.qrAuditEvent.findFirst({ where: { workspaceId: ws.id, action, ip: { not: null }, userAgent: 'qr-abuse-fixture' } }));
  const historical = await db.qrAuditEvent.create({ data: { workspaceId: ws.id, actorType: 'system', action: 'retention_fixture', ip: '192.0.2.1', userAgent: 'old', oldUrls: ['https://example.com/'], createdAt: new Date('2024-01-01') } });
  await purgeExpiredAbuseIp(); const scrubbed = await db.qrAuditEvent.findUniqueOrThrow({ where: { id: historical.id } }); assert.equal(scrubbed.ip, null); assert.equal(scrubbed.userAgent, null); assert.equal(scrubbed.action, 'retention_fixture'); assert.deepEqual(scrubbed.oldUrls, ['https://example.com/']);
  passed('create/update/delete audit and PII-only retention cleanup');
  console.log(`Abuse HTTP fixture passed: ${checks} groups`);
} finally {
  await db.workspace.deleteMany({ where: { id: { in: extraWorkspaceIds } } });
  await db.workspace.delete({ where: { id: ws.id } }); await db.user.delete({ where: { id: user.id } });
  // Verify evidence outlives cascading account/workspace cleanup.
  const evidence = await db.qrAuditEvent.count({ where: { workspaceId: ws.id } }); assert.ok(evidence > 0);
  await db.abuseReport.deleteMany({ where: { shortCode: { in: (await db.qrAuditEvent.findMany({ where: { workspaceId: ws.id }, select: { shortCode: true } })).flatMap(r => r.shortCode ? [r.shortCode] : []) } } });
  await db.qrAuditEvent.deleteMany({ where: { workspaceId: ws.id } });
  await db.emailOutbox.deleteMany({ where: { workspaceId: ws.id } });
  await db.qrAuditEvent.deleteMany({ where: { workspaceId: { in: extraWorkspaceIds } } });
  await db.$disconnect();
}
