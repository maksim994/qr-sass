/** Destructive fixtures ONLY in an explicitly named disposable local test database. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const url = new URL(process.env.RELEASE_TEST_DATABASE_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/qr_terms_test(?:_\w+)?$/.test(url.pathname)) {
  throw new Error('Set RELEASE_TEST_DATABASE_URL to a disposable LOCAL database named qr_terms_test');
}
process.env.DATABASE_URL = url.href;
process.env.JWT_SECRET = 'isolated-tests-only-jwt-secret-never-use-in-production';
process.env.NODE_ENV = 'test';
const { getDb } = await import('../src/lib/db.ts');
const db = getDb();
function run(command, args) {
  const result = spawnSync(command, args, { env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
try {
  const tables = await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables.length, 0, 'Test database must be empty');
  run('node_modules/.bin/prisma', ['db','push','--schema','prisma/legacy-schema.prisma','--skip-generate']);
  run('node_modules/.bin/prisma', ['db','execute','--schema','prisma/legacy-schema.prisma','--file','scripts/fixtures/legacy-workspaces.sql']);
  const qrBefore = await db.$queryRawUnsafe('SELECT row_to_json(q) AS value FROM "QrCode" q ORDER BY id');
  const subsBefore = await db.$queryRawUnsafe('SELECT row_to_json(s) AS value FROM "Subscription" s ORDER BY id');
  run('node', ['scripts/migrate-deploy.mjs']);
  assert.deepEqual(await db.$queryRawUnsafe('SELECT row_to_json(q) AS value FROM "QrCode" q ORDER BY id'), qrBefore);
  assert.deepEqual(await db.$queryRawUnsafe('SELECT row_to_json(s) AS value FROM "Subscription" s ORDER BY id'), subsBefore);
  const snapshots = await db.workspace.findMany({ orderBy: { id: 'asc' } });
  assert.ok(snapshots.every(w => w.accessMode === 'archive' && w.archivedPlan));
  run('node', ['scripts/migrate-deploy.mjs']);
  assert.deepEqual(await db.workspace.findMany({ orderBy: { id: 'asc' } }), snapshots);
  const { getEntitlements } = await import('../src/lib/entitlements.ts');
  const { assertCanCreateQrCodes } = await import('../src/lib/plans.ts');
  const { changeWorkspaceAccess } = await import('../src/lib/admin-operations.ts');
  const { applySucceededPayment } = await import('../src/lib/billing-apply.ts');
  const actor = { id: 'fixture-admin', email: 'fixture@example.invalid' };
  const business = await getEntitlements('legacy-business');
  assert.equal(business.planId, 'BUSINESS');
  assert.equal(business.periodEnd, null);
  assert.equal(business.allowsApi, true);
  await db.planOverride.update({ where: { planId: 'PRO' }, data: { priceRub: 9900, maxQrCodes: 1, maxUsers: 1 } });
  const pro = await getEntitlements('legacy-pro');
  assert.equal(pro.plan.priceRub, 199);
  assert.equal(pro.plan.limits.maxQrCodes, null);
  assert.equal(pro.plan.limits.maxUsers, 5);
  assert.equal((await assertCanCreateQrCodes({ workspaceId:'legacy-pro',planId:pro.planId,plan:pro.plan,count:20,needsDynamic:true })).ok, true);
  assert.equal((await getEntitlements('legacy-trial')).isTrial, true);
  assert.equal((await getEntitlements('legacy-expired')).planId, 'FREE');
  assert.equal(await db.qrCode.count({where:{workspaceId:'legacy-expired',isArchived:false}}),1);
  const { evaluateQrPublicAccess } = await import('../src/lib/qr-public-access.ts');
  assert.equal((await evaluateQrPublicAccess({ qr: await db.qrCode.findFirst({where:{workspaceId:'legacy-expired'}}),scanCount:99999 })).ok,true);
  const newWorkspace = await db.workspace.create({data:{name:'New',slug:'new-public'}});
  assert.equal(newWorkspace.accessMode,'standard');
  assert.equal(newWorkspace.archivedPlan,null);
  const payment = await db.payment.create({data:{workspaceId:'legacy-pro',providerPaymentId:'fixture-payment',amount:199,planId:'PRO',termsMode:'archive'}});
  const oldEnd = (await db.subscription.findUnique({where:{workspaceId:'legacy-pro'}})).currentPeriodEnd;
  assert.equal((await applySucceededPayment(payment.id)).applied,true);
  assert.equal((await getEntitlements('legacy-pro')).plan.priceRub,199);
  assert.ok((await db.subscription.findUnique({where:{workspaceId:'legacy-pro'}})).currentPeriodEnd > oldEnd);
  assert.equal((await applySucceededPayment(payment.id)).applied,false);
  await assert.rejects(changeWorkspaceAccess({id:'not-admin',email:'nobody@example.invalid'},'legacy-free',{plan:'FRIENDS',reason:'test'}));
  await changeWorkspaceAccess(actor,'legacy-expired',{plan:'FRIENDS',reason:'Бесплатный доступ для проверки'});
  const friends = await getEntitlements('legacy-expired',new Date('2100-01-01'));
  assert.equal(friends.plan.name,'Для своих');
  assert.equal(friends.plan.priceRub,0);
  assert.equal(friends.periodEnd,null);
  assert.equal(friends.allowsApi,true);
  assert.equal(friends.plan.limits.maxUsers,null);
  const latePayment = await db.payment.create({data:{workspaceId:'legacy-expired',providerPaymentId:'late-payment',amount:199,planId:'PRO',termsMode:'current'}});
  assert.equal((await applySucceededPayment(latePayment.id)).reason,'access_preserved');
  assert.equal((await getEntitlements('legacy-expired')).plan.name,'Для своих');
  const switchPayment = await db.payment.create({data:{workspaceId:'legacy-pro',providerPaymentId:'switch-payment',amount:2990,planId:'BUSINESS',termsMode:'current'}});
  assert.equal((await applySucceededPayment(switchPayment.id)).applied,true);
  assert.equal((await db.workspace.findUnique({where:{id:'legacy-pro'}})).accessMode,'standard');
  assert.ok(await db.adminAuditLog.count({where:{entityId:'legacy-expired'}}));
  assert.deepEqual(await db.$queryRawUnsafe('SELECT row_to_json(q) AS value FROM "QrCode" q ORDER BY id'), qrBefore);
  console.log('PASS: legacy upgrade/retry, immutable QR/subscriptions, archived pricing/quotas, expiry, admin-only friends, late/duplicate payments, explicit switch, new users');
} finally { await db.$disconnect(); }
