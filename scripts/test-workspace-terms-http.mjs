import assert from 'node:assert/strict';
const dbUrl = new URL(process.env.RELEASE_TEST_DATABASE_URL ?? 'http://invalid');
const base = new URL(process.env.RELEASE_TEST_APP_URL ?? 'http://invalid');
if (!['127.0.0.1','localhost'].includes(dbUrl.hostname) || !/^\/qr_terms_test(?:_\w+)?$/.test(dbUrl.pathname) || base.hostname !== '127.0.0.1' || base.port !== '3017') throw new Error('Only disposable local test DB and 127.0.0.1:3017 are allowed');
process.env.DATABASE_URL=dbUrl.href;
const { getDb }=await import('../src/lib/db.ts');
const { hash }=await import('bcryptjs');
const db=getDb();
const url=path=>new URL(path,base);
try {
  await db.user.update({where:{id:'fixture-admin'},data:{passwordHash:await hash('local-fixture-password',4)}});
  for(const w of await db.workspace.findMany()) await db.membership.upsert({where:{userId_workspaceId:{userId:'fixture-admin',workspaceId:w.id}},create:{workspaceId:w.id,userId:'fixture-admin',role:'OWNER'},update:{}});
  const payloads={ BUSINESS:{companyName:'Fixture old business'},COUPON:{title:'Fixture old coupon',promoCode:'KEEP-ME'},LINK_LIST:{title:'Fixture old links',links:[{label:'Existing link',url:'https://example.invalid/existing'}]} };
  for(const [contentType,payload] of Object.entries(payloads)) await db.qrCode.upsert({where:{id:'hosted-'+contentType},create:{id:'hosted-'+contentType,workspaceId:'legacy-free',createdById:'fixture-admin',kind:'DYNAMIC',contentType,name:contentType,shortCode:'hosted-'+contentType,encodedContent:'https://qr-s.ru/p/hosted-'+contentType,payload},update:{}});
  const health=await fetch(url('/api/health'));assert.equal(health.status,200);
  for(const [type,payload] of Object.entries(payloads)) {
    const response=await fetch(url('/p/hosted-'+type));assert.equal(response.status,200);
    const html=await response.text();assert.ok(html.includes(payload.title??payload.companyName));
    if(type==='LINK_LIST') assert.ok(html.includes('https://example.invalid/existing'));
    if(type==='COUPON') assert.ok(html.includes('KEEP-ME'));
  }
  const old=await fetch(base.origin+'//r/legacy-trial',{redirect:'manual'});
  // Next normalizes legacy double slashes before running the route.
  assert.equal(old.status,308);
  assert.ok(old.headers.get('location')?.endsWith('/r/legacy-trial'));
  const redirect=await fetch(url('/r/legacy-trial'),{redirect:'manual'});
  assert.equal(redirect.status,307);assert.equal(redirect.headers.get('location'),'https://example.invalid/old');
  const homepage=await (await fetch(url('/'))).text();assert.ok(!homepage.includes('Для своих'));
  const login=await fetch(url('/api/auth/login'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'fixture@example.invalid',password:'local-fixture-password'})});
  assert.equal(login.status,200);
  const session=login.headers.getSetCookie().find(c=>c.startsWith('qr_saas_session='))?.split(';')[0];assert.ok(session);
  const headers={'content-type':'application/json',cookie:session+'; csrf_token=fixture; qr_workspace_id=legacy-expired',origin:base.origin,'x-csrf-token':'fixture'};
  const billing=await fetch(url('/dashboard/billing'),{headers});assert.equal(billing.status,200);
  const html=await billing.text();assert.ok(html.includes('Для своих'));assert.ok(html.includes('без срока окончания'));
  const detail=await fetch(url('/admin/workspaces/legacy-expired'),{headers});assert.equal(detail.status,200);assert.ok((await detail.text()).includes('Бессрочно, без оплаты'));
  for(const endpoint of ['checkout','trial']) {
    const denied=await fetch(url('/api/billing/'+endpoint),{method:'POST',headers,body:JSON.stringify({workspaceId:'legacy-expired',planId:'PRO',useCurrentTerms:true})});assert.equal(denied.status,409);
  }
  const unauthorized=await fetch(url('/api/admin/workspaces/legacy-free/plan'),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({plan:'FRIENDS',reason:'Unauthorized'})});assert.equal(unauthorized.status,401);
  console.log('PASS: health, legacy double-slash redirects, hosted business/coupon/link-list content, public catalog, friends billing/admin, payment/trial blocking, unauthorized assignment');
} finally {await db.$disconnect();}
