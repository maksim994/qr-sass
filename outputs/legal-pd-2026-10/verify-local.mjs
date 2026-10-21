import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
process.env.DATABASE_URL = 'postgresql://mvmolkov@127.0.0.1:5432/qr_legal_pd_20261021?schema=public';
const { getDb } = await import('../../src/lib/db.ts');
const { LEGAL_VERSION, legalSnapshot } = await import('../../src/lib/legal-documents.ts');
const { oauthStateHash } = await import('../../src/lib/legal-acceptance.ts');
const db = getDb(), base = 'http://127.0.0.1:3020';
const out = new URL('./', import.meta.url), results = [];
let ip = 1;
function check(name, detail) { results.push({ name, ...detail }); }
const jar = () => new Map([['csrf_token', crypto.randomUUID()]]);
async function request(path, { method = 'GET', body, cookies = jar() } = {}) {
  const headers = { origin: base, 'x-forwarded-for': `127.0.1.${ip++}`, cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), 'x-csrf-token': cookies.get('csrf_token') };
  if (body) headers['content-type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(';')[0], split = pair.indexOf('=');
    cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }
  return response;
}
async function userAbsent(code) { assert.equal(await db.user.count({ where: { yandexId: code } }), 0); }
async function callback(state, cookies, code) {
  return request(`/api/auth/yandex/callback?state=${encodeURIComponent(state)}&code=${code}`, { cookies });
}
const qrBefore = await db.qrCode.findMany({ orderBy: { id: 'asc' } });
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
  for (const [path, file] of [['/privacy-policy', 'privacy.after.html'], ['/personal-data-consent', 'consent.after.html'], ['/login', 'login.after.html'], ['/register', 'register.after.html'], ['/register/yandex', 'yandex.after.html']]) {
    const response = await request(path), html = await response.text();
    assert.equal(response.status, 200, path);
    writeFileSync(new URL(file, out), html);
    if (path === '/privacy-policy') {
      assert.ok(html.includes('Обработка персональных данных осуществляется с 01.01.2023.'));
      assert.ok(html.includes('Трансграничная передача персональных данных не осуществляется.'));
      assert.ok(!html.includes('предоставляются по запросу'));
      for (const name of ['Бегет', 'Яндекс', 'РОБОКАССА']) assert.ok(html.includes(`ООО «${name}»`));
    }
    if (path === '/personal-data-consent') {
      assert.ok(html.includes(LEGAL_VERSION));
      for (const name of ['Бегет', 'Яндекс', 'РОБОКАССА']) assert.ok(html.includes(`ООО «${name}»`));
    }
    if (path === '/login') {
      assert.ok(!html.includes('соглашаетесь с обработкой персональных данных'));
      assert.ok(html.includes('Входя, вы принимаете'));
    }
    if (path.startsWith('/register')) {
      const inputs = html.match(/<input\b[^>]*type="checkbox"[^>]*>/g) || [];
      assert.equal(inputs.length, 2);
      for (const input of inputs) { assert.match(input, /\brequired(?:[=\s>])/); assert.doesNotMatch(input, /\bchecked(?:[=\s>])/); }
      assert.ok(html.includes('href="/personal-data-consent"'));
    }
    check(path, { status: response.status });
  }
  const valid = { termsAccepted: true, consent: true, legalVersion: LEGAL_VERSION };
  const email = 'pd-fixture-email@example.invalid';
  assert.equal(await db.user.count({ where: { email } }), 0);
  for (const bad of [{}, { ...valid, consent: false }, { ...valid, termsAccepted: false }, { ...valid, legalVersion: '2026-10-21.1' }]) {
    for (const endpoint of ['/api/auth/register', '/api/auth/yandex']) {
      const response = await request(endpoint, { method: 'POST', body: { name: 'Локальный тест', email, password: 'local-fixture-password', ...bad } });
      assert.equal(response.status, 400, endpoint);
    }
  }
  assert.equal(await db.user.count({ where: { email } }), 0);
  assert.equal(await db.oAuthLegalIntent.count(), 0);
  check('server refuses missing/false confirmations and stale version', { rejected: 8, usersCreated: 0, intentsCreated: 0 });
  const registered = await request('/api/auth/register', { method: 'POST', body: { name: 'Локальный тест', email, password: 'local-fixture-password', ...valid } });
  assert.equal(registered.status, 200, await registered.text());

  // New visitor entering through ordinary login cannot bypass the consent step.
  const loginCookies = jar();
  const start = await request('/api/auth/yandex', { cookies: loginCookies });
  const loginState = new URL(start.headers.get('location')).searchParams.get('state');
  const deniedCode = 'pd-fixture-no-intent';
  const denied = await callback(loginState, loginCookies, deniedCode);
  assert.equal(new URL(denied.headers.get('location')).pathname, '/register/yandex');
  await userAbsent(deniedCode);
  check('new Yandex login without receipt', { status: denied.status, destination: '/register/yandex', usersCreated: 0 });

  async function registrationIntent() {
    const cookies = jar();
    const response = await request('/api/auth/yandex', { method: 'POST', cookies, body: valid });
    assert.equal(response.status, 200);
    const json = await response.json();
    const state = new URL(json.data.url).searchParams.get('state');
    const intent = await db.oAuthLegalIntent.findUniqueOrThrow({ where: { stateHash: oauthStateHash(state) } });
    assert.deepEqual(intent.documents, legalSnapshot());
    return { cookies, state, intent };
  }
  for (const mode of ['expired', 'old-version']) {
    const { cookies, state } = await registrationIntent();
    await db.oAuthLegalIntent.update({ where: { stateHash: oauthStateHash(state) }, data: mode === 'expired' ? { expiresAt: new Date(0) } : { version: '2026-10-21.1' } });
    const code = `pd-fixture-${mode}`;
    const response = await callback(state, cookies, code);
    assert.equal(new URL(response.headers.get('location')).pathname, '/register/yandex');
    await userAbsent(code);
    check(`Yandex ${mode} receipt`, { destination: '/register/yandex', usersCreated: 0 });
  }
  const { cookies, state, intent } = await registrationIntent();
  const replayCookies = new Map(cookies), code = 'pd-fixture-accepted';
  const success = await callback(state, cookies, code);
  assert.equal(new URL(success.headers.get('location')).pathname, '/dashboard');
  assert.equal(await db.oAuthLegalIntent.count({ where: { stateHash: oauthStateHash(state) } }), 0);
  const replay = await callback(state, replayCookies, 'pd-fixture-replay');
  assert.equal(new URL(replay.headers.get('location')).pathname, '/register/yandex');
  await userAbsent('pd-fixture-replay');
  check('Yandex one-use receipt', { destination: '/dashboard', replayUsersCreated: 0 });

  const receipts = await db.legalAcceptance.findMany({ where: { user: { email: { in: [email, `${code}@example.invalid`] } } }, orderBy: { source: 'asc' } });
  assert.equal(receipts.length, 2);
  for (const receipt of receipts) {
    assert.equal(receipt.version, LEGAL_VERSION);
    assert.equal(receipt.termsAccepted, true); assert.equal(receipt.dataConsent, true);
    assert.deepEqual(receipt.documents, legalSnapshot());
    if (receipt.source === 'yandex') assert.equal(receipt.acceptedAt.toISOString(), intent.acceptedAt.toISOString());
  }
  writeFileSync(new URL('acceptance-evidence.json', out), JSON.stringify(receipts.map(({ source, version, acceptedAt, termsAccepted, dataConsent, documents }) => ({ source, version, acceptedAt, termsAccepted, dataConsent, documentVersion: documents.version, privacyVersion: documents.privacyVersion, documentsSha256: digest(documents) })), null, 2));
  const oldQr = qrBefore.filter(q => q.kind === 'DYNAMIC' && q.contentType === 'URL' && !q.isArchived && !q.passwordHash && !q.expireAt && q.maxScans === null).slice(0, 3);
  assert.equal(oldQr.length, 3);
  for (const qr of oldQr) {
    const response = await request(`/r/${qr.shortCode}`);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), qr.currentTargetUrl);
    check('existing local QR redirect', { shortCode: qr.shortCode, status: response.status, target: qr.currentTargetUrl });
  }
  const qrAfter = await db.qrCode.findMany({ orderBy: { id: 'asc' } });
  assert.deepEqual(qrAfter, qrBefore);
  check('existing QR data unchanged', { count: qrAfter.length, beforeSha256: digest(qrBefore), afterSha256: digest(qrAfter) });
  writeFileSync(new URL('checks.json', out), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, receipts: receipts.length, qrCount: qrAfter.length }));
} finally { await db.$disconnect(); }
