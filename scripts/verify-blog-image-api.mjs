// Mutates only this run's named drafts/images/token; production requires an explicit fixture-only flag.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { getDb } from '../src/lib/db.ts';
import { createBlogApiToken, revokeBlogApiToken } from '../src/lib/blog-api-tokens.ts';
import { deleteFile } from '../src/lib/s3.ts';
import { replaceArticleImage } from '../src/lib/blog-image-content.ts';
import { renderArticleBody } from '../src/lib/blog-render.ts';
const origin = (process.env.BLOG_TEST_ORIGIN || process.env.APP_URL).replace(/\/+$/, '');
const production = process.env.BLOG_IMAGE_API_PRODUCTION_SMOKE === 'explicit-tz07-fixtures-only';
if (production) {
  assert.equal(new URL(origin).origin,'https://qr-s.ru');
  assert.equal(new URL(process.env.S3_PUBLIC_URL||process.env.S3_ENDPOINT).hostname,'s3.mvmolkov.ru');
} else {
  const dbUrl = new URL(process.env.DATABASE_URL);
  assert.ok(['qr_tz06_stage4','qr_stage4_smoke'].includes(dbUrl.pathname.slice(1)));
  assert.ok(process.env.JWT_SECRET?.startsWith('local-tz06-'));
}
const db = getDb(), run = Date.now(), prefix = `tz07-api-${run}`, tokenName = `ТЗ-07 проверка ${run}`;
const admin = await db.user.findFirstOrThrow({where:{isAdmin:true},select:{id:true}});
const actor = {actorId:admin.id,actorName:'Проверка ТЗ-07',source:'admin'};
let key; let checks = 0; const postIds = [];
async function request(path,method='GET',body,status=200,authenticated=true) {
  const response = await fetch(origin+path,{method,headers:{...(authenticated?{Authorization:`Bearer ${key.token}`}:{Cookie:'qr_saas_session=invalid'}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(60000)});
  const text = await response.text(); let json;try{json=JSON.parse(text);}catch{}
  assert.equal(response.status,status,`${method} ${path}: ${response.status} ${json?.error||''}`); checks++;
  if (status<300) { assert.equal(json.ok,true); assert.match(response.headers.get('cache-control'),/no-store/); }
  return json?.data;
}
const png = await sharp({create:{width:1800,height:900,channels:3,background:'#215c79'}}).png().toBuffer();
function form(alt='Изображение ТЗ-07',blob=png,type='image/png') { const f = new FormData(); f.set('file',new File([blob],'tz07.png',{type})); if(alt!==null)f.set('alt',alt);return f; }
async function unchanged(id,work) {
  const before = await db.blogPost.findUniqueOrThrow({where:{id}});
  const revisions = await db.blogRevision.count({where:{postId:id}}), events=await db.blogEvent.count({where:{postId:id}}), previews=await db.blogPreviewToken.count({where:{postId:id}});
  await work();
  assert.deepEqual(await db.blogPost.findUniqueOrThrow({where:{id}}),before);
  assert.equal(await db.blogRevision.count({where:{postId:id}}),revisions);
  assert.equal(await db.blogEvent.count({where:{postId:id}}),events);
  assert.equal(await db.blogPreviewToken.count({where:{postId:id}}),previews);checks++;
}
try {
  key=await createBlogApiToken(tokenName,actor);
  await request('/api/v1/images','POST',form(),401,false);
  await request('/api/v1/images','POST',form(null),400);
  await request('/api/v1/images','POST',form('x',Buffer.from('<svg/>'),'image/png'),400);
  await request('/api/v1/images','POST',form('x',Buffer.alloc(10*1024*1024+1),'image/png'),400);
  const badKind=form();badKind.set('kind','other');await request('/api/v1/images','POST',badKind,400);
  const articlesBefore=await db.blogPost.count(), revisionsBefore=await db.blogRevision.count();
  const image=await request('/api/v1/images','POST',form(),201);
  assert.equal(await db.blogPost.count(),articlesBefore);assert.equal(await db.blogRevision.count(),revisionsBefore);checks++;
  assert.deepEqual(image.variants.map(v=>v.width),[480,960,1600]);assert.equal(image.url,image.variants.at(-1).url);assert.ok(image.srcset.includes('480w')&&image.figure.includes('srcset='));
  for (const v of image.variants) { const r=await fetch(v.url);assert.equal(r.status,200);const m=await sharp(Buffer.from(await r.arrayBuffer())).metadata();assert.equal(m.format,'webp');assert.equal(m.width,v.width);assert.equal(m.height,v.height);checks++; }
  const event=await db.blogEvent.findFirstOrThrow({where:{postId:`image:${image.id}`,type:'image_upload'}});assert.equal(event.actorName,`API: ${tokenName}`);assert.equal(event.source,'api');checks++;
  const old='https://example.invalid/old.webp';
  for (const format of ['html','markdown']) {
    let post=await request('/api/v1/articles','POST',{title:`Проверка ТЗ-07 ${format}`,slug:`${prefix}-${format}`,format,content:format==='html'?`<h2 id="keep">Якорь</h2>\n<p>Первый &amp; второй</p>\n<figure><img src="${old}" alt="Old" width="100" height="50"></figure><a href="#keep">Назад</a>`:`## Якорь {#keep}\n\n![Old](${old} "Title")\n\n\`![Code](${old})\``,coverImageUrl:old,coverImageAlt:'Old',minorEdit:true},201);
    postIds.push(post.id);assert.equal(post.status,'draft');
    await request(`/api/v1/articles/${post.id}/preview`,'POST',{},401,false);
    await unchanged(post.id,async()=>{
      const preview=await request(`/api/v1/articles/${post.id}/preview`,'POST',{});
      assert.deepEqual(preview,renderArticleBody(post.content,format,post.faq));
      const temp=await request(`/api/v1/articles/${post.id}/preview`,'POST',{content:'## Временный {#temp}\n\n<script>alert(1)</script>',format:'markdown',faq:[{question:'Вопрос',answer:'Ответ'}]});
      assert.match(temp.html,/id="temp"/);assert.match(temp.html,/Частые вопросы/);assert.doesNotMatch(temp.html,/<script>/);
      await request(`/api/v1/articles/${post.id}/preview`,'POST',{published:true},400);
      await request(`/api/v1/articles/${post.id}/preview`,'POST',{content:42},400);
    });
    const before=post;
    post=await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:old,newUrl:image.url,alt:'Новый alt',minorEdit:true,comment:'Замена ТЗ-07'});
    assert.equal(post.version,before.version+1);assert.equal(post.format,format);assert.equal(post.contentUpdatedAt,before.contentUpdatedAt);assert.equal(post.publishedAt,before.publishedAt);assert.equal(post.firstPublishedAt,before.firstPublishedAt);assert.equal(post.scheduledAt,before.scheduledAt);assert.equal(post.coverImageUrl,image.url);assert.equal(post.coverImageAlt,'Новый alt');assert.equal(post.legacyHtml,before.legacyHtml);assert.notEqual(post.updatedAt,before.updatedAt);
    assert.equal(post.content,replaceArticleImage(before.content,{url:old,newUrl:image.url,alt:'Новый alt',variants:image.variants},format).content);checks++;
    const revision=await db.blogRevision.findFirstOrThrow({where:{postId:post.id,number:post.version}});assert.equal(revision.actorName,`API: ${tokenName}`);
    const savedEvent=await db.blogEvent.findFirstOrThrow({where:{revisionId:revision.id,type:'update'}});assert.equal(savedEvent.source,'api');assert.ok(savedEvent.fields.includes('content'));checks++;
    await unchanged(post.id,async()=>{
      await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:before.version,url:image.url,newUrl:old,alt:'Stale'},409);
      await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:'https://example.invalid/missing.webp',newUrl:old,alt:'Missing'},404);
      for(const newUrl of ['javascript:alert(1)','//evil.example/x','https://user:pass@example.org/x','https://example.org/a b'])await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:image.url,newUrl,alt:'Bad'},400);
      await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:image.url,alt:'No',status:'published'},400);
      await request(`/api/v1/articles/${post.id}`,'PATCH',{version:post.version,status:'published'},403);
      if(format==='html')await request(`/api/v1/articles/${post.id}`,'PATCH',{version:post.version,content:post.content+'<p>Broader edit</p>'},400);
      await request(`/api/v1/articles/${post.id}`,'DELETE',undefined,405);
    });
    const same=await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:image.url,newUrl:image.url,alt:'Новый alt'});
    assert.equal(same.content,post.content);assert.equal(same.contentUpdatedAt,post.contentUpdatedAt);post=same;checks++;
    const altOnly=await request(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:image.url,alt:'Только alt',minorEdit:true});assert.equal(altOnly.contentUpdatedAt,post.contentUpdatedAt);post=altOnly;
    const path=`/api/v1/articles/${post.id}/images`,body={version:post.version,url:image.url,newUrl:'https://example.invalid/external.webp',alt:'External',minorEdit:true};
    const responses=await Promise.all([0,1].map(()=>fetch(origin+path,{method:'PATCH',headers:{Authorization:`Bearer ${key.token}`,'Content-Type':'application/json'},body:JSON.stringify(body)})));
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);await Promise.all(responses.map(r=>r.body?.cancel()));checks++;
  }
  await request('/api/v1/articles/missing-tz07/preview','POST',{},404);
  await request('/api/v1/images','DELETE',undefined,405);
  const spec=await (await fetch(origin+'/api/v1/openapi.json')).json();
  assert.ok(spec.paths['/api/v1/images'] && spec.paths['/api/v1/articles/{id}/preview']);checks++;
  // Only this fixture's key: prove the same aggregate limiter covers both new endpoints.
  await db.blogApiToken.update({where:{id:key.id},data:{requestCount:60,windowStartedAt:new Date()}});
  await request('/api/v1/images','POST',form(),429);
  await request(`/api/v1/articles/${postIds[0]}/preview`,'POST',{},429);
  await revokeBlogApiToken(key.id,actor);
  await request('/api/v1/images','POST',form(),401);
  console.log(JSON.stringify({ok:true,checks,production,webpWidths:[480,960,1600],htmlAndMarkdown:true,previewNoWrites:true,minorDatesPreserved:true,concurrentConflict409:true}));
} finally {
  for(const row of await db.blogImage.findMany({where:{actorName:`API: ${tokenName}`}})) {
    for(const variant of row.variants)await deleteFile(variant.key);
    await db.blogImage.delete({where:{id:row.id}});
  }
  const fixtures=await db.blogPost.findMany({where:{slug:{startsWith:prefix}}});
  for(const post of fixtures) {assert.equal(post.status,'draft');assert.equal(post.publishedAt,null);await db.blogPost.delete({where:{id:post.id}});await db.blogEvent.create({data:{postId:post.id,postTitle:post.title,...actor,type:'delete',fields:[],comment:'Удалён только служебный черновик ТЗ-07, история сохранена'}});}
  if(key)await revokeBlogApiToken(key.id,actor);
  assert.equal(await db.blogPost.count({where:{slug:{startsWith:prefix}}}),0);
  assert.equal(await db.blogImage.count({where:{actorName:`API: ${tokenName}`}}),0);
  await db.$disconnect();
}
