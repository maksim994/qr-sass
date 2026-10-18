import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {SignJWT} from "jose";
import {getDb} from "../src/lib/db.ts";
import {getPlanSync} from "../src/lib/plans.ts";
const dbUrl=new URL(process.env.DATABASE_URL!);
if(dbUrl.hostname!=="127.0.0.1"||dbUrl.port!=="55448"||dbUrl.pathname!=="/qr_readiness")throw new Error("Requires dedicated local TZ-01 fixture database");
const db=getDb(),run=randomUUID(),base="http://localhost:3108";
const u=await db.user.create({data:{email:`tz01-${run}@example.test`,passwordHash:"synthetic-only"}});
const ws=await db.workspace.create({data:{name:"Synthetic TZ01",slug:`tz01-${run}`,memberships:{create:{userId:u.id,role:"OWNER"}}}});
const token=await new SignJWT({sub:u.id,email:u.email,sv:u.sessionVersion}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("synthetic-readiness-secret-at-least-32-characters"));
const headers={Cookie:`qr_saas_session=${token}; qr_workspace_id=${ws.id}; csrf_token=tz01`,Origin:base,"X-CSRF-Token":"tz01","Content-Type":"application/json"};
const call=(path:string,body:unknown={},method="POST")=>fetch(base+path,{method,headers,body:JSON.stringify(body)});
const oldOverride=await db.planOverride.findUnique({where:{planId:"PRO"}});
async function resetPrice(){if(oldOverride)await db.planOverride.update({where:{planId:"PRO"},data:{priceRub:oldOverride.priceRub}});else await db.planOverride.deleteMany({where:{planId:"PRO"}});}
let passed=0;function pass(message:string){passed++;console.log(`PASS ${message}`);}
try{
  const create=()=>call("/api/qr",{workspaceId:ws.id,kind:"DYNAMIC",contentType:"URL",name:"Synthetic dynamic",payload:{url:"https://example.com/original"},style:{}});
  const responses=await Promise.all([create(),create(),create()]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,200,403]);
  const qr=await db.qrCode.findMany({where:{workspaceId:ws.id}});assert.equal(qr.length,2);assert.ok(qr.every(q=>q.kind==="DYNAMIC"));pass("concurrent FREE creation admits exactly two dynamics, never downgrades to static");
  const id=qr[0].id,encoded=qr[0].encodedContent;
  assert.equal((await call(`/api/qr/${id}/target`,{targetUrl:"https://example.com/changed"},"PATCH")).status,200);
  assert.equal((await db.qrCode.findUniqueOrThrow({where:{id}})).encodedContent,encoded);
  const r=await fetch(base+`/r/${qr[0].shortCode}`,{redirect:"manual"});assert.equal(r.status,307);assert.equal(r.headers.get("location"),"https://example.com/changed");pass("free destination editing preserves short code and printed contents");
  await db.qrCode.createMany({data:[1,2,3].map(i=>({createdById:u.id,styleConfig:{},workspaceId:ws.id,kind:"DYNAMIC" as const,contentType:"URL" as const,name:`Historical ${i}`,shortCode:`old-${i}-${run}`,encodedContent:`${base}/r/old-${i}-${run}`,currentTargetUrl:"https://example.com/legacy",payload:{url:"https://example.com/legacy"}}))});
  const before=await db.qrCode.findMany({where:{workspaceId:ws.id}});
  assert.equal((await create()).status,403);
  for(const old of before){const response=await fetch(`${base}/r/${old.shortCode}`,{redirect:"manual"});assert.equal(response.status,307);}
  assert.deepEqual(await db.qrCode.findMany({where:{workspaceId:ws.id}}),before);pass("grandfathering: all five existing codes retain complete contract and open");
  const authGet=(path:string)=>fetch(base+path,{headers});
  for(const days of [7,14,30,90,7]){const response=await authGet(`/dashboard/analytics?days=${days}`);assert.equal(response.status,200);const html=await response.text();assert.match(html.replace(/<!--.*?-->/g,""),new RegExp(`${days} дней`));}pass("7/14/30/90-day analytics server routes and return switching");
  for(const path of ["/pricing","/","/dynamic-qr","/qr-menu","/qr-for-packaging"]){const response=await fetch(base+path);assert.equal(response.status,200);const html=await response.text();assert.doesNotMatch(html,/Только статические|на платном тарифе или в пробном периоде/);if(path==="/pricing"){assert.match(html,/<table/);assert.match(html,/299/);assert.match(html,/2.?990/);assert.equal((html.match(/<h1\b/g)||[]).length,1);}}pass("public SSR pricing, a single H1, corrected free dynamic copy");
  for(const path of ["/blog?category=xyz","/blog?category=","/blog?page=99","/blog?page=0","/blog?page=1abc"]){assert.equal((await fetch(base+path)).status,404,path);}pass("invalid category and page queries are real HTTP 404s");
  await db.planOverride.upsert({where:{planId:"PRO"},create:{planId:"PRO",priceRub:449},update:{priceRub:449}});
  for(const path of ["/","/pricing","/dynamic-qr"]){const html=await(await fetch(base+path)).text();assert.match(html,/449/);}
  const checkout=await call("/api/billing/checkout",{workspaceId:ws.id,planId:"PRO"});assert.equal(checkout.status,200);const order=(await checkout.json()).data;
  assert.equal((await db.payment.findUniqueOrThrow({where:{id:order.paymentId}})).amount,449);
  await resetPrice();pass("one DB price change reaches SSR home, pricing, landing, client hints and checkout");
  const sitemap=await(await fetch(base+"/sitemap.xml")).text();assert.match(sitemap,/\/pricing</);assert.match(sitemap,/\/personal-data-consent</);assert.equal((sitemap.match(/<loc>/g)||[]).length,(sitemap.match(/<lastmod>/g)||[]).length);pass("sitemap includes prices and consent with stable lastmod on every URL");
  await db.funnelEvent.create({data:{workspaceId:ws.id,qrCodeId:id,name:"first_external_open"}});
  const open1=await(await call("/api/analytics/owner-open")).json();assert.ok(open1.data.events.length>=1);assert.deepEqual(Object.keys(open1.data.events[0]),["type"]);
  const open2=await(await call("/api/analytics/owner-open")).json();assert.equal(open2.data.events.length,0);pass("first external open is claimed once by owner and returns no scanner identity");
  const subscription=await db.subscription.create({data:{workspaceId:ws.id,plan:"PRO",currentPeriodEnd:new Date(Date.now()+86400_000)}});
  const payment=await db.payment.create({data:{workspaceId:ws.id,subscriptionId:subscription.id,provider:"robokassa",providerPaymentId:`synthetic-${run}`,status:"SUCCEEDED",planId:"PRO",amount:299,paidAt:new Date()}});
  const [p1,p2]=await Promise.all([call("/api/analytics/payment",{paymentId:payment.id}),call("/api/analytics/payment",{paymentId:payment.id})]);
  const claimed=await Promise.all([p1.json(),p2.json()]);assert.equal(claimed.filter(p=>p.data.payment).length,1);assert.equal(claimed.find(p=>p.data.payment)?.data.payment.revenue,299);
  assert.equal((await(await call("/api/analytics/payment",{paymentId:payment.id})).json()).data.payment,null);pass("verified payment claimed once across concurrent requests and refresh");
  assert.equal(getPlanSync("PRO").limits.maxUsers,5);pass("PRO team rights retained");
  console.log(`PASS ${passed} TZ01 groups`);
}finally{await resetPrice();await db.workspace.delete({where:{id:ws.id}});await db.user.delete({where:{id:u.id}});await db.$disconnect();}
