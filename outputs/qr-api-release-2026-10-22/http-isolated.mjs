import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {generateApiKey} from '../src/lib/api-keys.ts';
import { getDb } from '../src/lib/db.ts';

// Explicit guard: this creates synthetic users and must never target production.
const base = new URL(process.env.RELEASE_TEST_APP_URL ?? 'http://invalid');
const dbUrl = new URL(process.env.DATABASE_URL ?? 'http://invalid');
assert.equal(base.hostname,'qr-api-release-app-20261022');
assert.equal(dbUrl.hostname,'qr-api-release-pg-20261022');
assert.equal(dbUrl.pathname,'/qr_saas');
assert.ok(process.env.JWT_SECRET?.length >= 32);
const db = getDb();
const suffix = randomUUID();
const workspaces = [];
const users = [];
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
async function call(path, {key, cookie, status=200, method='GET', body, headers={}}={}) {
  const response=await fetch(new URL(path,base), {method, headers:{...headers,...(key?{authorization:`Bearer ${key}`} : {}), ...(cookie?{cookie}:{}), ...(body ? {'content-type':'application/json'}:{})}, body:body?JSON.stringify(body):undefined, redirect:'manual'});
  assert.equal(response.status,status,`${method} ${path}: ${response.status} ${response.status!==status? await response.text():''}`); checks++;
  check(response.headers.get('cache-control')?.includes('no-store'), `no-store ${path}`);
  return response;
}
async function json(path,options) {return (await (await call(path,options)).json()).data;}
async function seed(label,plan='FREE') {
  const user=await db.user.create({data:{email:`qr-api-${label}-${suffix}@example.invalid`,passwordHash:await bcrypt.hash('Synthetic-api-test-123!',10),name:`QR API ${label}`}}); users.push(user.id);
  const workspace=await db.workspace.create({data:{name:`Synthetic ${label}`,slug:`qr-api-${label}-${suffix}`,plan,memberships:{create:{userId:user.id,role:'OWNER'}},...(plan!=='FREE'?{subscription:{create:{plan,status:'active',currentPeriodEnd:new Date(Date.now()+86400000)}}}:{})}}); workspaces.push(workspace.id);
  const jwt=await new SignJWT({email:user.email,sv:0}).setSubject(user.id).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return {user,workspace,cookie:`qr_saas_session=${jwt}; csrf_token=qr-api-test-csrf`};
}
async function createKey(tenant,scopes=['qr:read','qr:write','stats:read'],name='Bitrix') {
  return json(`/api/workspaces/${tenant.workspace.id}/qr-api-keys`,{cookie:tenant.cookie,method:'POST',status:201,headers:{'x-csrf-token':'qr-api-test-csrf',origin:base.origin},body:{name,scopes}});
}
try {
  const owner=await seed('owner'), foreign=await seed('foreign'), pro=await seed('pro','PRO'), business=await seed('business','BUSINESS');
  const key=await createKey(owner), otherKey=await createKey(foreign), proKey=await createKey(pro);
  check(key.key.startsWith('qrs_api_'),'new prefix');
  const businessKey=await createKey(business);
  check((await json('/api/v1/qr/key',{key:businessKey.key})).plan==='BUSINESS','BUSINESS also gets QR API');
  const legacy=generateApiKey();
  await db.apiKey.create({data:{workspaceId:business.workspace.id,name:'Legacy fixture',keyHash:legacy.hash,keyPrefix:legacy.prefix}});
  const legacyResult=await fetch(new URL(`/api/qr?workspaceId=${business.workspace.id}`,base),{headers:{authorization:`Bearer ${legacy.key}`}});
  check(legacyResult.status===200,'legacy Business QR API still works');
  await call('/api/v1/qr',{key:legacy.key,status:401});
  const newInLegacy=await fetch(new URL(`/api/qr?workspaceId=${business.workspace.id}`,base),{headers:{authorization:`Bearer ${businessKey.key}`}});
  check(newInLegacy.status===401,'scoped keys cannot bypass scopes through legacy API');
  const spec=await (await fetch(new URL('/api/v1/openapi.json',base))).json();
  check(spec.info.version==='1.5.0'&&spec.paths['/api/v1/qr']&&spec.paths['/api/v1/articles'],'combined schema served');
  const stored=await db.qrApiKey.findUniqueOrThrow({where:{id:key.id}});
  check(stored.keyHash!==key.key && !JSON.stringify(stored).includes(key.key),'hash only in DB');
  const listed=await json(`/api/workspaces/${owner.workspace.id}/qr-api-keys`,{cookie:owner.cookie});
  check(!JSON.stringify(listed).includes(key.key) && !JSON.stringify(listed).includes(stored.keyHash),'list contains no secrets');
  await call('/api/v1/qr',{status:401,cookie:owner.cookie});
  await call(`/api/v1/qr?key=${key.key}`,{status:401});
  for (const wrong of ['qre_invalid','qrs_blog_invalid']) await call('/api/v1/qr',{key:wrong,status:401});
  await call('/api/v1/qr',{method:'POST',cookie:owner.cookie,status:401,headers:{origin:base.origin},body:{name:'Denied',targetUrl:'https://example.com'}});
  await call(`/api/workspaces/${owner.workspace.id}/qr-api-keys`,{method:'POST',cookie:owner.cookie,status:403,headers:{origin:base.origin},body:{name:'CSRF',scopes:['qr:read']}});
  await call(`/api/workspaces/${owner.workspace.id}/qr-api-keys`,{method:'POST',cookie:foreign.cookie,status:403,body:{name:'Foreign',scopes:['qr:read']}});
  const info=await json('/api/v1/qr/key',{key:key.key});
  check(info.plan==='FREE'&&info.limits.maxDynamicQr===2,'FREE api rights');
  const read=await createKey(owner,['qr:read'],'Read only');
  await call('/api/v1/qr',{key:read.key,method:'POST',status:403,body:{name:'Denied',targetUrl:'https://example.com'}});
  for (const targetUrl of ['javascript:alert(1)','https://user:pass@example.com']) await call('/api/v1/qr',{key:key.key,method:'POST',status:400,body:{name:'Invalid',targetUrl}});
  await call('/api/v1/qr',{key:key.key,method:'POST',status:400,body:{name:'Foreign',targetUrl:'https://example.com',workspaceId:foreign.workspace.id}});
  const first=await json('/api/v1/qr',{key:key.key,method:'POST',status:201,body:{name:'Товар 123',targetUrl:'https://example.com/old',source:'bitrix_module'}});
  check(first.source==='bitrix_module'&&first.shortUrl===`https://qr-s.ru/r/${first.shortCode}`,'source and normalized URL');
  const baseline=await db.qrCode.findUniqueOrThrow({where:{id:first.id}});
  await call(`/api/v1/qr/${first.id}`,{key:otherKey.key,status:404});
  for (const tail of ['image','stats?from=2026-10-01&to=2026-10-22']) await call(`/api/v1/qr/${first.id}/${tail}`,{key:otherKey.key,status:404});
  await call(`/api/v1/qr/${first.id}`,{key:otherKey.key,method:'PATCH',status:404,body:{targetUrl:'https://example.com/hijack'}});
  const updated=await json(`/api/v1/qr/${first.id}`,{key:key.key,method:'PATCH',body:{targetUrl:'https://example.com/new'}});
  check(updated.shortUrl===first.shortUrl&&updated.shortCode===first.shortCode,'printed QR stays identical');
  const after=await db.qrCode.findUniqueOrThrow({where:{id:first.id}});
  check(after.encodedContent===baseline.encodedContent&&after.currentTargetUrl==='https://example.com/new','destination changes only');
  const png=await call(`/api/v1/qr/${first.id}/image?size=600&errorCorrectionLevel=H`,{key:read.key});
  const {data,info: image}=await sharp(Buffer.from(await png.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  check(jsQR(new Uint8ClampedArray(data),image.width,image.height)?.data===first.shortUrl,'PNG decodes to printed redirect');
  const svg=await call(`/api/v1/qr/${first.id}/image?format=svg&foreground=%23000000&background=%23ffffff`,{key:key.key});
  check(svg.headers.get('content-type').startsWith('image/svg+xml')&&(await svg.text()).includes('<svg'),'SVG export');
  await call(`/api/v1/qr/${first.id}/image?foreground=%23ffffff`,{key:key.key,status:400});
  await call(`/api/v1/qr/${first.id}/image?size=99999`,{key:key.key,status:400});
  await db.scanEvent.createMany({data:[
    {qrCodeId:first.id,scannedAt:new Date('2026-10-21T00:00:00Z'),deviceType:'mobile',userAgentRaw:'must-not-leak',ipHash:'private-ip'},
    {qrCodeId:first.id,scannedAt:new Date('2026-10-21T23:59:59.999Z'),deviceType:'desktop'},
    {qrCodeId:first.id,scannedAt:new Date('2026-10-22T00:00:00Z'),deviceType:'unknown'},
  ]});
  const stats=await json(`/api/v1/qr/${first.id}/stats?from=2026-10-20&to=2026-10-21`,{key:key.key});
  check(stats.total===2&&stats.byDay.length===2&&stats.byDay[0].count===0&&stats.byDay[1].count===2,'UTC inclusive dates and zero fill');
  check(stats.byDevice.length===2&&!JSON.stringify(stats).includes('private-ip')&&!JSON.stringify(stats).includes('must-not-leak'),'aggregated device data only');
  await call(`/api/v1/qr/${first.id}/stats?from=2026-10-20&to=2026-10-21`,{key:read.key,status:403});
  const statsOnly=await createKey(owner,['stats:read'],'Statistics only');
  await call('/api/v1/qr',{key:statsOnly.key,status:403});
  check((await json(`/api/v1/qr/${first.id}/stats?from=2026-10-21&to=2026-10-21`,{key:statsOnly.key})).total===2,'stats-only key can read statistics');
  await call(`/api/v1/qr/${first.id}/stats?from=2026-02-30&to=2026-10-22`,{key:key.key,status:400});
  const parallel=await Promise.all([1,2,3,4].map(i=>fetch(new URL('/api/v1/qr',base),{method:'POST',headers:{authorization:`Bearer ${key.key}`,'content-type':'application/json'},body:JSON.stringify({name:`Concurrent ${i}`,targetUrl:'https://example.com'})})));
  check(parallel.filter(r=>r.status===201).length===1&&parallel.filter(r=>r.status===403).length===3,'concurrent FREE creates enforce two total');
  check(await db.qrCode.count({where:{workspaceId:owner.workspace.id}})===2,'FREE quota no overrun');
  for (let i=0;i<3;i++) await json('/api/v1/qr',{key:proKey.key,method:'POST',status:201,body:{name:`Pro ${i}`,targetUrl:'https://example.com'}});
  check((await json('/api/v1/qr?limit=1&offset=0',{key:proKey.key})).nextOffset===1,'pagination');
  const beforePage=await db.qrCode.findMany({where:{workspaceId:owner.workspace.id},orderBy:{id:'asc'}});
  const page=await fetch(new URL('/dashboard/api-keys',base),{headers:{cookie:owner.cookie}});
  check(page.status===200&&/no-store|no-cache/.test(page.headers.get('cache-control')??''),`keys page private: ${page.status} ${page.headers.get('cache-control')}`);
  check((await page.text()).includes('Разрешения ключа'),'management SSR');
  await call(`/api/workspaces/${owner.workspace.id}/qr-api-keys/${read.id}`,{cookie:owner.cookie,method:'DELETE'});
  await call('/api/v1/qr',{key:read.key,status:401});
  // Downgrade creator must invalidate every outstanding QR API credential immediately.
  await db.membership.update({where:{userId_workspaceId:{userId:foreign.user.id,workspaceId:foreign.workspace.id}},data:{role:'MEMBER'}});
  await call('/api/v1/qr/key',{key:otherKey.key,status:401});
  await call(`/api/workspaces/${foreign.workspace.id}/qr-api-keys`,{cookie:foreign.cookie,method:'POST',status:403,body:{name:'Member forbidden',scopes:['qr:read']}});
  // Use a fresh key to test the atomic shared rate window without earlier requests.
  const rate=await createKey(pro,['qr:read'],'Rate test');
  await db.qrApiKey.update({where:{id:rate.id},data:{windowStartedAt:new Date(Math.floor(Date.now()/60000)*60000),requestCount:58}});
  const rateResults=await Promise.all(Array.from({length:5},()=>fetch(new URL('/api/v1/qr/key',base),{headers:{authorization:`Bearer ${rate.key}`}})));
  check(rateResults.filter(r=>r.status===200).length===2&&rateResults.filter(r=>r.status===429).length===3,'atomic rate limiting');
  check(rateResults.filter(r=>r.status===429).every(r=>Number(r.headers.get('retry-after'))>0&&r.headers.get('cache-control')?.includes('no-store')),'retry and privacy headers');
  await db.qrApiKey.update({where:{id:rate.id},data:{windowStartedAt:new Date(Date.now()-120000),requestCount:60}});
  await call('/api/v1/qr/key',{key:rate.key});
  const activeCount=await db.qrApiKey.count({where:{workspaceId:business.workspace.id,revokedAt:null}});
  await db.qrApiKey.createMany({data:Array.from({length:20-activeCount},(_,i)=>({workspaceId:business.workspace.id,createdById:business.user.id,name:`Quota ${i}`,keyPrefix:'synthetic',keyHash:`${suffix}-quota-${i}`,scopes:['qr:read']}))});
  await call(`/api/workspaces/${business.workspace.id}/qr-api-keys`,{cookie:business.cookie,method:'POST',status:403,body:{name:'Limit 21',scopes:['qr:read']}});
  check(JSON.stringify(await db.qrCode.findMany({where:{workspaceId:owner.workspace.id},orderBy:{id:'asc'}}))===JSON.stringify(beforePage),'read/list/export/revoke do not rewrite QR rows');
  console.log(JSON.stringify({ok:true,checks,synthetic:true,productionAccess:false}));
} finally {
  for (const id of workspaces) await db.workspace.deleteMany({where:{id}});
  for (const id of users) await db.user.deleteMany({where:{id}});
  await db.$disconnect();
}
