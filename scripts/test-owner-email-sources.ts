/** Integration acceptance on a separate local database; no mail or provider requests. */
import assert from 'node:assert/strict';
import { getDb } from '../src/lib/db.ts';
import { recordBusinessEvent } from '../src/lib/business-events.ts';
import { scheduleEmailNotifications } from '../src/lib/email-worker.ts';
import { decryptIntegrationSecret } from '../src/lib/integration-secrets.ts';
import { LEGAL_VERSION } from '../src/lib/legal-documents.ts';
import { findOrCreateYandexUser } from '../src/lib/yandex-auth.ts';
import { legalReceipt } from '../src/lib/legal-acceptance.ts';

const database = new URL(process.env.DATABASE_URL!);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.pathname, '/notifications_test_integrated_20261021');
const db = getDb(), base = 'http://127.0.0.1:3339';
const run = Date.now().toString(), checks: string[] = [];
const source = { utmSource: 'vk', utmMedium: 'cpc', utmCampaign: 'autumn', utmContent: 'DO-NOT-EMAIL', utmTerm: null,
  clickId: 'DO-NOT-EMAIL-CLICK', clickIdType: 'vkclid' as const, referrer: 'example.org/path', landingPath: '/', firstTouchAt: new Date().toISOString() };
function message(cipher: string | null) { return JSON.parse(decryptIntegrationSecret(cipher!)) as { text: string; html: string }; }
try {
  await db.telegramSettings.updateMany({ data: { enabled: false } });
  const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: {
    'content-type': 'application/json', cookie: 'csrf_token=local-integrated', 'x-csrf-token': 'local-integrated',
    'x-forwarded-for': '8.8.4.4',
  }, body: JSON.stringify({ name: 'Integrated local', email: `integrated-${run}@example.test`, password: `synthetic-${run}`, workspaceName: 'Local acceptance',
    consent: true, termsAccepted: true, legalVersion: LEGAL_VERSION, signupSource: source }) });
  assert.equal(response.status, 200, await response.clone().text());
  const { data: { userId } } = await response.json();
  const registration = await db.emailOutbox.findUniqueOrThrow({ where: { key: `owner:registration:${userId}` } });
  assert.match(message(registration.payloadCipher).text, /Источник: vk\/cpc\/autumn/);
  assert.ok(message(registration.payloadCipher).text.includes(`/admin/users/${userId}`));
  assert.equal(await db.emailOutbox.count({ where: { userId, kind: 'verify_email' } }), 1);
  const acceptance = await db.legalAcceptance.findFirstOrThrow({ where: { userId } });
  assert.equal(acceptance.version, '2026-10-21.3');
  checks.push('HTTP email signup atomically stores source, edition .3, verification and owner email with Telegram disabled');
  const workspace = await db.membership.findFirstOrThrow({ where: { userId } });
  const payment = await db.payment.create({ data: { workspaceId: workspace.workspaceId, provider: 'robokassa', providerPaymentId: `integrated-${run}`,
    amount: 299, status: 'SUCCEEDED', planId: 'PRO', paidAt: new Date(), signupSourceUserId: userId, isTest: false } });
  const event = { key: `integrated-payment:${run}`, name: 'payment_succeeded', paymentId: payment.id, userId: 'tz11-legacy-user', isTest: false,
    payload: { amount: 299, plan: 'PRO', periodEnd: new Date().toISOString() } };
  await db.$transaction(tx => recordBusinessEvent(tx, event));
  await db.$transaction(tx => recordBusinessEvent(tx, event));
  const paymentJob = await db.emailOutbox.findUniqueOrThrow({ where: { key: `owner:${event.key}` } });
  assert.match(message(paymentJob.payloadCipher).text, /Источник: vk\/cpc\/autumn/);
  assert.equal(await db.emailOutbox.count({ where: { key: `owner:${event.key}` } }), 1);
  checks.push('payment source follows checkout payer, not workspace owner; duplicate events do not duplicate owner mail');
  const yandex = await findOrCreateYandexUser({ yandexId: `integrated-${run}`, email: `integrated-yandex-${run}@example.test`, name: 'Local Yandex' },
    legalReceipt('yandex'), { ...source, firstTouchAt: new Date().toISOString() });
  const yandexJob = await db.emailOutbox.findUniqueOrThrow({ where: { key: `owner:registration:${yandex.id}` } });
  assert.match(message(yandexJob.payloadCipher).text, /Источник: vk\/cpc\/autumn/);
  checks.push('Yandex server-side signup also queues owner source email without external OAuth');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const start = new Date(`${today}T00:00:00+03:00`), tomorrow = new Date(start.getTime() + 86400000);
  const now = new Date(tomorrow.getTime() + 9 * 3600000);
  const digestKey = `digest:${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)}`;
  // Only this guarded, disposable local database is used; make the acceptance rerunnable.
  await db.emailOutbox.deleteMany({ where: { key: digestKey } });
  await db.emailControl.update({ where: { id: 'default' }, data: { enabledSince: new Date(Number(run)), lastScheduledAt: null } });
  await scheduleEmailNotifications(now);
  const digest = await db.emailOutbox.findUniqueOrThrow({ where: { key: digestKey } });
  const digestMessage = message(digest.payloadCipher);
  assert.match(digestMessage.text, /vk\/cpc\/autumn: регистрации — 2, оплаты — 1, выручка — 299 ₽/);
  for (const job of [registration, paymentJob, yandexJob, digest]) {
    const value = message(job.payloadCipher);
    assert.doesNotMatch(value.text + value.html, /DO-NOT-EMAIL/);
    assert.equal(job.toEmail, 'maksim994@yandex.ru');
  }
  assert.equal(await db.notificationOutbox.count({ where: { key: { in: [`event:registration:${userId}`, `event:${event.key}`] } } }), 0);
  checks.push('09:00 Moscow digest groups registrations, payments and revenue; no click IDs or full first-touch in mail; Telegram stays off');
  console.log(JSON.stringify({ ok: true, checks, externalEmails: 0, externalPayments: 0, externalOAuth: 0 }, null, 2));
} finally { await db.$disconnect(); }
