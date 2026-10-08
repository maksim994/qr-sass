import assert from "node:assert/strict";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { getDb } from "../src/lib/db.ts";
const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/qr_readiness") throw new Error("Requires isolated qr_readiness DB on localhost:55438");
const db = getDb(), base = "http://localhost:3108", run = randomUUID(), token = "synthetic-readiness-telegram-token", userIds: string[] = [], spaces: string[] = [];
const first = 2_000_000_000 + randomInt(1_000_000), legacyId = first + 1, collisionId = first + 2;
function signed(id: number, age = 0) {
  const p = new URLSearchParams({ signature: "synthetic-provider-signature", auth_date: String(Math.floor(Date.now()/1000)-age), user: JSON.stringify({ id, first_name: "Synthetic Telegram" }) });
  const data = [...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();p.set("hash",createHmac("sha256",secret).update(data).digest("hex"));return p.toString();
}
const auth = (raw: string) => fetch(base+"/api/telegram/auth", { method:"POST", headers:{"Content-Type":"application/json",Origin:base,"X-CSRF-Token":"telegram-test",Cookie:"csrf_token=telegram-test"},body:JSON.stringify({initDataRaw:raw}) });
try {
  const responses = await Promise.all([auth(signed(first)),auth(signed(first))]);
  for (const response of responses) assert.equal(response.status,200,await response.clone().text());
  const results = await Promise.all(responses.map(r=>r.json()));const id = results[0].data.userId;userIds.push(id);
  assert.equal(results[1].data.userId,id);assert.equal(await db.authIdentity.count({where:{provider:"telegram",subject:String(first)}}),1);
  const owner = await db.membership.findMany({where:{userId:id,role:"OWNER"}});assert.equal(owner.length,1);spaces.push(owner[0].workspaceId);
  assert.equal(await db.businessEvent.count({where:{key:`registration:${id}`}}),1);
  assert.ok(responses.every(r=>r.headers.get("set-cookie")?.includes("qr_saas_session=")));
  await db.user.update({where:{id},data:{email:`telegram-moved-${run}@example.test`}});
  const repeat = await auth(signed(first));assert.equal(repeat.status,200);assert.equal((await repeat.json()).data.userId,id);
  console.log("PASS concurrent first Telegram login creates one identity/workspace/event; provider ID survives email changes");
  const legacy = await db.user.create({data:{email:`tg-${legacyId}@telegram.local`,passwordHash:"telegram-auth",emailVerifiedAt:new Date(),memberships:{create:{role:"OWNER",workspace:{create:{name:"Synthetic legacy Telegram",slug:`legacy-${run}`}}}}},include:{memberships:true}});userIds.push(legacy.id);spaces.push(legacy.memberships[0].workspaceId);
  const legacyLogin = await auth(signed(legacyId));assert.equal(legacyLogin.status,200);assert.equal((await legacyLogin.json()).data.userId,legacy.id);
  assert.equal(await db.membership.count({where:{userId:legacy.id}}),1);assert.equal((await db.authIdentity.findUniqueOrThrow({where:{provider_subject:{provider:"telegram",subject:String(legacyId)}}})).userId,legacy.id);
  console.log("PASS verified legacy provider-only account binds without changing its user or workspace");
  const collision = await db.user.create({data:{email:`tg-${collisionId}@telegram.local`,passwordHash:"synthetic-password-account",emailVerifiedAt:new Date()}});userIds.push(collision.id);
  const denied = await auth(signed(collisionId));assert.equal(denied.status,409);assert.ok(!denied.headers.get("set-cookie")?.includes("qr_saas_session="));assert.equal(await db.authIdentity.count({where:{provider:"telegram",subject:String(collisionId)}}),0);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:collision.id}})).passwordHash,"synthetic-password-account");
  console.log("PASS email collision cannot bind or take over a password account; no session is issued");
  for(const raw of [signed(first,7200),signed(first).replace(/hash=[a-f0-9]+/,"hash="+"0".repeat(64))]){const denied=await auth(raw);assert.equal(denied.status,401);assert.ok(!denied.headers.get("set-cookie")?.includes("qr_saas_session="));}
  console.log("PASS expired and invalid Telegram signatures cannot issue a session");
  console.log("4 Telegram HTTP checks passed");
} finally {
  const discovered = await db.user.findMany({where:{email:{in:[`tg-${first}@telegram.local`,`tg-${legacyId}@telegram.local`,`tg-${collisionId}@telegram.local`,`telegram-moved-${run}@example.test`]}},select:{id:true}});
  const ids = [...new Set([...userIds,...discovered.map(u=>u.id)])];const memberships = await db.membership.findMany({where:{userId:{in:ids}},select:{workspaceId:true}});
  await db.workspace.deleteMany({where:{id:{in:[...spaces,...memberships.map(m=>m.workspaceId)]}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();
}
