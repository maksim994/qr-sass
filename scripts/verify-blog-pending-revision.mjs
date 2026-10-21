// Synthetic fixtures in a dedicated local database only. Never use production credentials.
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { SignJWT } from "jose";
import { JSDOM } from "jsdom";
import { getDb } from "../src/lib/db.ts";
import { saveArticle } from "../src/lib/blog-workflow.ts";
import { createBlogApiToken } from "../src/lib/blog-api-tokens.ts";
const database = new URL(process.env.DATABASE_URL);
const origin = process.env.BLOG_TEST_ORIGIN || "http://127.0.0.1:3009";
assert.ok(["localhost","127.0.0.1"].includes(database.hostname) && database.pathname === "/qr_tz09");
assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname));
assert.ok(process.env.JWT_SECRET?.startsWith("local-tz09-"));
const db = getDb(), run = Date.now();
let checks=0;
const admin=await db.user.upsert({where:{email:"tz09-admin@example.invalid"},create:{email:"tz09-admin@example.invalid",passwordHash:"unusable",isAdmin:true},update:{}});
const reader=await db.user.upsert({where:{email:"tz09-reader@example.invalid"},create:{email:"tz09-reader@example.invalid",passwordHash:"unusable"},update:{}});
const actor={actorId:admin.id,actorName:admin.email,source:"admin"};
const jwt=async(user)=>new SignJWT({email:user.email,sv:user.sessionVersion}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
const session=await jwt(admin), readerSession=await jwt(reader);
const key=await createBlogApiToken(`TZ09 ${run}`,actor);
async function req(path,method="GET",body,auth="api",csrf="tz09") {
 const headers={"Content-Type":"application/json"};
 if(auth==="api")headers.Authorization=`Bearer ${key.token}`;
 if(auth==="admin"||auth==="reader"){headers.Cookie=`qr_saas_session=${auth==="admin"?session:readerSession}; csrf_token=tz09`;headers.Origin=origin;headers["x-csrf-token"]=csrf;}
 const response=await fetch(origin+path,{method,headers,redirect:"manual",body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await response.text();let json;try{json=JSON.parse(raw)}catch{}
 return {response,raw,json};
}
async function expect(path,method="GET",body,auth="api",status=200,csrf) {
 const r=await req(path,method,body,auth,csrf);
 assert.equal(r.response.status,status,`${method} ${path}: ${r.json?.error||r.raw.slice(0,120)}`);checks++;
 return r;
}
async function ok(...args){return(await expect(...args)).json.data;}
const beforeQr=await db.qrCode.count();
const cat=await db.blogCategory.upsert({where:{slug:"guides"},create:{slug:"guides",name:"Гайды",sortOrder:1},update:{}});
const post=await saveArticle({title:`ТЗ09 Живая статья ${run}`,slug:`tz09-${run}`,content:"## Живой текст\n\nИсходная строка.",format:"markdown",status:"published",categoryId:cat.id},actor);
const p=`/api/v1/articles/${post.id}`,r=p+"/revision",a=`/api/admin/blog/${post.id}/revision`;
const initial=await db.blogPost.findUniqueOrThrow({where:{id:post.id}}), count=await db.blogRevision.count({where:{postId:post.id}});
const liveLink=await ok(`/api/admin/blog/${post.id}/preview-token`,"POST",{},"admin");
for(const auth of ["none","admin"])for(const [suffix,method,body] of [["","GET"],["","PUT",{title:"Forbidden"}],["","DELETE"],["/preview","POST"]])await expect(r+suffix,method,body,auth,401);
await expect(r,"GET",undefined,"api",404);
for(const field of ["slug","status","publishedAt","published","minorEdit"])await expect(r,"PUT",{[field]:"forbidden"},"api",400);
let pending=await ok(r,"PUT",{version:1,title:"ТЗ09 Новый заголовок",content:"## Черновой текст\n\nНовая строка.",metaTitle:"Новый meta title",faq:[{question:"Новый вопрос?",answer:"Новый ответ"}],categoryId:cat.id,structuredData:{"@type":"Thing",name:"Pending"}});
assert.equal(await db.blogPendingRevision.count({where:{postId:post.id}}),1);checks++;
assert.deepEqual(await db.blogPost.findUniqueOrThrow({where:{id:post.id}}),initial);checks++;
assert.equal(await db.blogRevision.count({where:{postId:post.id}}),count);checks++;
const live=await expect(`/blog/${post.slug}`,"GET",undefined,"none");assert.ok(live.raw.includes("Живой текст")&&!live.raw.includes("Черновой текст"));checks++;
const entry=(xml)=>[...new JSDOM(xml,{contentType:"text/xml"}).window.document.querySelectorAll("url")].find(n=>n.querySelector("loc")?.textContent.endsWith(`/blog/${post.slug}`));
const oldDate=entry((await req("/sitemap.xml","GET",undefined,"none")).raw).querySelector("lastmod").textContent;
assert.equal(oldDate,initial.contentUpdatedAt.toISOString());checks++;
pending=await ok(r,"PUT",{metaDescription:"Описание черновика"});assert.equal(pending.input.title,"ТЗ09 Новый заголовок");assert.equal(pending.input.metaDescription,"Описание черновика");checks++;
const read=await expect(r);assert.match(read.response.headers.get("cache-control"),/no-store/);assert.equal(read.json.data.id,pending.id);checks++;
const link=await ok(r+"/preview","POST");assert.equal(link.url,origin+link.path);checks++;
const preview=await expect(link.path,"GET",undefined,"none");assert.ok(preview.raw.includes("Черновой текст"));assert.match(preview.response.headers.get("cache-control"),/no-store/);assert.match(preview.response.headers.get("x-robots-tag"),/noindex/);checks++;
const rotated=await ok(r+"/preview","POST");await expect(link.path,"GET",undefined,"none",404);await expect(liveLink.path,"GET",undefined,"none");
await ok(`/api/admin/blog/${post.id}/preview-token`,"POST",{},"admin");await expect(rotated.path,"GET",undefined,"none");
const edit=await expect(`/admin/blog/${post.id}/edit`,"GET",undefined,"admin");assert.ok(edit.raw.includes("Сравнить с живой версией")&&edit.raw.includes("Черновой текст")&&edit.raw.includes("Опубликовать изменения"));checks++;
assert.ok((await req("/admin/blog","GET",undefined,"admin")).raw.includes("Есть черновик изменений"));checks++;
for(const method of ["POST","PATCH"])await expect(r,method,{},"api",405);
for(const auth of ["none","reader","api"])await expect(a,"POST",{id:pending.id,updatedAt:pending.updatedAt},auth,401);
await expect(a,"POST",{id:pending.id,updatedAt:pending.updatedAt},"admin",403,"wrong");
await expect(a,"POST",{id:pending.id,updatedAt:initial.updatedAt.toISOString()},"admin",409);
await ok(a,"POST",{id:pending.id,updatedAt:pending.updatedAt},"admin");
const published=await db.blogPost.findUniqueOrThrow({where:{id:post.id}});
for(const field of ["id","slug","createdAt","createdById","publishedAt","firstPublishedAt","views","likes"])assert.deepEqual(published[field],initial[field],field);
assert.equal(published.title,"ТЗ09 Новый заголовок");assert.equal(published.content,pending.input.content);assert.ok(published.contentUpdatedAt>initial.contentUpdatedAt);checks++;
assert.equal(await db.blogRevision.count({where:{postId:post.id}}),count+1);assert.equal(await db.blogPendingRevision.count({where:{postId:post.id}}),0);checks++;
await expect(rotated.path,"GET",undefined,"none",404);await expect(r,"GET",undefined,"api",404);
const sitemap=entry((await req("/sitemap.xml","GET",undefined,"none")).raw);assert.equal(sitemap.querySelector("lastmod").textContent,published.contentUpdatedAt.toISOString());checks++;
const original=await db.blogRevision.findFirstOrThrow({where:{postId:post.id},orderBy:{number:"asc"}});
await ok(`/api/admin/blog/${post.id}/restore`,"POST",{revisionId:original.id,expectedUpdatedAt:published.updatedAt.toISOString()},"admin");
assert.equal((await db.blogPost.findUniqueOrThrow({where:{id:post.id}})).content,initial.content);checks++;
pending=await ok(r,"PUT",{title:"Отменяемый черновик"});const cancelLink=await ok(r+"/preview","POST");const beforeCancel=await db.blogPost.findUniqueOrThrow({where:{id:post.id}});
await ok(r,"DELETE");assert.deepEqual(await db.blogPost.findUniqueOrThrow({where:{id:post.id}}),beforeCancel);await expect(cancelLink.path,"GET",undefined,"none",404);checks++;
pending=await ok(r,"PUT",{title:"Устаревший черновик"});
const newer=await ok(r,"PUT",{title:"Обновлённый черновик"});
await expect(a,"POST",{id:pending.id,updatedAt:pending.updatedAt},"admin",409);
await expect(a,"DELETE",{id:pending.id,updatedAt:pending.updatedAt},"admin",409);
await saveArticle({title:"Живая конкурентная правка"},actor,post.id);
await expect(a,"POST",{id:newer.id,updatedAt:newer.updatedAt},"admin",409);
await expect(r,"PUT",{title:"Попытка перезаписать"},"api",409);
await ok(a,"DELETE",{id:newer.id,updatedAt:newer.updatedAt},"admin");
const draft=await saveArticle({title:"Обычный черновик",slug:`tz09-draft-${run}`,content:"## Draft"},actor);
await expect(`/api/v1/articles/${draft.id}/revision`,"PUT",{title:"Нельзя"},"api",409);
const legacy=await db.blogPost.create({data:{title:"Старая HTML статья",slug:`tz09-legacy-${run}`,content:"<h2>Исходный HTML</h2>",publishedAt:new Date("2026-01-01T00:00:00Z")}});
await expect(`/api/v1/articles/${legacy.id}/revision`,"PUT",{content:"## Markdown"},"api",400);
const converted=await ok(`/api/v1/articles/${legacy.id}/revision`,"PUT",{content:"## Markdown",format:"markdown",confirmConversion:true});
assert.equal((await db.blogPost.findUniqueOrThrow({where:{id:legacy.id}})).format,"html");checks++;
await ok(`/api/admin/blog/${legacy.id}/revision`,"POST",{id:converted.id,updatedAt:converted.updatedAt},"admin");assert.equal((await db.blogPost.findUniqueOrThrow({where:{id:legacy.id}})).legacyHtml,legacy.content);checks++;
// Concurrent writers must merge disjoint patches and publish exactly once.
const racing=await saveArticle({title:"Конкурентная статья",slug:`tz09-race-${run}`,content:"## Исходник",status:"published"},actor);
const rp=`/api/v1/articles/${racing.id}/revision`,ra=`/api/admin/blog/${racing.id}/revision`;
const raceSaves=await Promise.all([req(rp,"PUT",{title:"Параллельный заголовок"}),req(rp,"PUT",{metaDescription:"Параллельное описание"})]);
assert.deepEqual(raceSaves.map(r=>r.response.status),[200,200]);
const racePending=await ok(rp);assert.equal(racePending.input.title,"Параллельный заголовок");assert.equal(racePending.input.metaDescription,"Параллельное описание");checks++;
const racePublishes=await Promise.all([req(ra,"POST",{id:racePending.id,updatedAt:racePending.updatedAt},"admin"),req(ra,"POST",{id:racePending.id,updatedAt:racePending.updatedAt},"admin")]);
assert.deepEqual(racePublishes.map(r=>r.response.status).sort(),[200,404]);assert.equal(await db.blogRevision.count({where:{postId:racing.id}}),2);checks++;
const replacement=await ok(rp,"PUT",{title:"Старый черновик"});await ok(rp,"DELETE");const replacementNew=await ok(rp,"PUT",{title:"Новый отдельный черновик"});
assert.notEqual(replacement.id,replacementNew.id);await expect(ra,"POST",{id:replacement.id,updatedAt:replacementNew.updatedAt},"admin",409);
// Snapshot preview stays exact even when an unrelated live field changes.
const snapshotLink=await ok(rp+"/preview","POST");await saveArticle({excerpt:"Только в живой версии"},actor,racing.id);
const snapshotPreview=await expect(snapshotLink.path,"GET",undefined,"none");assert.ok(!snapshotPreview.raw.includes("Только в живой версии"));checks++;
await ok(rp,"DELETE");
// Keep enough realistic synthetic cards for page 2 and a category page, plus a pending UI fixture.
for(let i=1;i<=19;i++)await saveArticle({title:`Как использовать QR-код: пример ${i}`,slug:`tz09-grid-${run}-${i}`,content:"## Пример\n\nПолезная инструкция для посетителей.",excerpt:"Как выбрать содержимое кода, распечатать его и проверить сканирование.",status:"published",categoryId:cat.id},actor);
const fixture=await ok(r,"PUT",{title:"ТЗ09 Черновик для визуальной проверки",content:"## Новый текст для сравнения\n\nИсправленная строка."});
assert.equal(await db.qrCode.count(),beforeQr);checks++;
writeFileSync("/tmp/qr-tz09-fixture.json",JSON.stringify({session,postId:post.id,pending:fixture,origin}),{mode:0o600});
mkdirSync("outputs/tz09",{recursive:true});writeFileSync("outputs/tz09/integration.json",JSON.stringify({checks,passed:true,qrCountUnchanged:true},null,2)+"\n");
console.log(`Pending revision integration: ${checks} checks passed.`);
await db.$disconnect();
