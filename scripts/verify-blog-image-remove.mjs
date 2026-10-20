// Writes fixtures ONLY in this task's dedicated local DB (or an explicitly isolated restore).
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { SignJWT } from 'jose';
import { getDb } from '../src/lib/db.ts';
import { createBlogApiToken } from '../src/lib/blog-api-tokens.ts';
import { renderArticleBody } from '../src/lib/blog-render.ts';

const database = new URL(process.env.DATABASE_URL);
const isolated = process.env.BLOG_REMOVE_ISOLATED === 'explicit-tz08-restored-copy';
const origin = process.env.BLOG_TEST_ORIGIN || 'http://localhost:3008';
assert.ok(isolated || (['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname === '/qr_tz08'));
assert.ok(process.env.JWT_SECRET?.startsWith('local-tz06-'));
assert.ok(isolated || ['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const db = getDb(), prefix = `tz08-${Date.now()}`, ids = [], keys = [];
const admin = await db.user.create({ data: { email: `${prefix}@example.invalid`, passwordHash: 'unusable', isAdmin: true } });
const session = await new SignJWT({ email: admin.email, sv: admin.sessionVersion }).setProtectedHeader({alg:'HS256'}).setSubject(admin.id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET));
const actor = { actorId: admin.id, actorName: 'ТЗ-08 проверка', source: 'admin' };
let checks = 0;
async function request(path, body, {status=200, key=keys[0], admin=false, csrf=true}={}) {
  const headers = { 'Content-Type':'application/json', ...(admin ? { Cookie:`qr_saas_session=${session}; csrf_token=tz08`, ...(csrf ? {'x-csrf-token':'tz08'} : {}), Origin: origin } : key ? { Authorization:`Bearer ${key.token}` } : {}) };
  const response = await fetch(origin + path, {method:'POST', headers, body:JSON.stringify(body)});
  const json = await response.json();
  assert.equal(response.status,status,`${path}: ${response.status} ${json.error||''}`); checks++;
  return json;
}
async function patch(id, body, status=200, key=keys[0]) {
  const response = await fetch(`${origin}/api/v1/articles/${id}/images`, {method:'PATCH', headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key.token}`}:{Cookie:`qr_saas_session=${session}`})},body:JSON.stringify(body)});
  const json=await response.json();assert.equal(response.status,status,json.error);checks++;
  assert.match(response.headers.get('cache-control'),/no-store/);
  return json;
}
async function state(id) {
  const post=await db.blogPost.findUniqueOrThrow({where:{id}});
  // Opening a public page legitimately increments views.
  const stable={...post};delete stable.views;
  return {post:stable,revisions:await db.blogRevision.findMany({where:{postId:id},orderBy:{number:'asc'}}),events:await db.blogEvent.findMany({where:{postId:id},orderBy:{createdAt:'asc'}})};
}
async function page(slug) {
  const response=await fetch(`${origin}/blog/${slug}`);assert.equal(response.status,200);checks++;
  const dom=new JSDOM(await response.text()), doc=dom.window.document;
  const result={body:doc.querySelector('.qrs-body')?.innerHTML,headings:[...doc.querySelectorAll('.qrs-body h2')].map(h=>[h.id,h.textContent]),tables:[...doc.querySelectorAll('.qrs-body table')].map(t=>t.outerHTML),links:[...doc.querySelectorAll('.qrs-body a')].map(a=>a.outerHTML),dates:[...doc.querySelectorAll('time')].map(t=>t.outerHTML),jsonld:[...doc.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent)};
  dom.window.close();return result;
}
async function lastmod(slug) {
  const xml=await (await fetch(origin+'/sitemap.xml')).text();
  const entry=xml.split('<url>').find(row=>row.includes(`/blog/${slug}</loc>`));
  assert.ok(entry);return entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
}
const url='https://s3.mvmolkov.ru/qr/blog/content/UMbjoWh-Pkyz.webp';
const then=new Date('2026-07-14T08:00:00Z');
try {
  keys.push(await createBlogApiToken(`${prefix}-a`,actor),await createBlogApiToken(`${prefix}-b`,actor));
  for (const format of ['html','markdown']) {
    let beforeText=format==='html'?'<h2 id="before">До</h2>\n<p>Первый  &amp; второй</p>\n':'## До {#before}\n\nПервый  & второй\n\n';
    let fragment=format==='html'?`<figure class="inline-quad" data-slot="inline_2">\n<img src="${url}" alt="Старая таблица"><figcaption>Подпись</figcaption>\n</figure>`:`![Таблица](${url} "Подпись")`;
    let afterText=format==='html'?'\n<h2 id="after">После</h2><table><tr><td>1</td></tr></table><a href="/blog/x">Ссылка</a>':'\n\n## После {#after}\n\n| A |\n|---|\n| 1 |\n\n[Ссылка](/blog/x)';
    if (format === 'html' && process.env.BLOG_REMOVE_SOURCE_SLUG) {
      assert.ok(isolated, 'Real source is only read on an isolated restored DB');
      const source = await db.blogPost.findUniqueOrThrow({where:{slug:process.env.BLOG_REMOVE_SOURCE_SLUG}});
      assert.equal(source.format,'html');
      const dom = new JSDOM(source.content,{includeNodeLocations:true});
      const target = [...dom.window.document.querySelectorAll('img')].find(img=>img.getAttribute('src')===url);
      assert.ok(target);const figure=target.closest('figure');assert.ok(figure);
      assert.equal(figure.getAttribute('data-slot'),'inline_2');assert.ok(figure.classList.contains('inline-quad'));
      const location=dom.nodeLocation(figure);assert.ok(location?.endTag);
      beforeText=source.content.slice(0,location.startOffset);fragment=source.content.slice(location.startOffset,location.endOffset);afterText=source.content.slice(location.endOffset);
      dom.window.close();
    }
    const content=beforeText+fragment+afterText;
    const post=await db.blogPost.create({data:{slug:`${prefix}-${format}`,title:`ТЗ-08 ${format}`,content,format,contentUpdatedAt:then,publishedAt:then,firstPublishedAt:then,status:'published',updatedAt:then,legacyHtml:'Exact legacy backup',coverImageUrl:'https://example.org/cover.webp',readingTimeMinutes:3,renderedHtml:format==='markdown'?renderArticleBody(content,format).html:null}});
    ids.push(post.id);
    const path=`/api/v1/articles/${post.id}`;
    const publicBefore=await page(post.slug), sitemapBefore=await lastmod(post.slug);
    const original=await state(post.id);
    const preview=await request(path+'/preview',{imageRemoval:{url,remove:true}});
    assert.equal(preview.data.content,beforeText+afterText);assert.ok(!preview.data.html.includes(url));
    const adminPreview=await request('/api/admin/blog/preview',{content,format,slug:post.slug,imageRemoval:{url,remove:true}},{admin:true});
    assert.equal(adminPreview.data.content,preview.data.content);assert.ok(!adminPreview.data.html.includes(url));
    await request('/api/admin/blog/preview',{content,format,imageRemoval:{url,remove:true}},{admin:true,csrf:false,status:403});
    assert.deepEqual(await state(post.id),original);checks++;
    await patch(post.id,{version:0,url,remove:true},401,null);
    await patch(post.id,{url,remove:true},400);
    await patch(post.id,{version:0,url:'https://example.org/cover.webp',remove:true},400);
    await patch(post.id,{version:0,url:'/not-found',remove:true},404);
    const saved=(await patch(post.id,{version:0,url,remove:true,minorEdit:true,comment:'Удалена таблица-дубль'})).data;
    assert.equal(saved.version,1);assert.equal(saved.content,beforeText+afterText);
    for(const field of ['contentUpdatedAt','publishedAt','firstPublishedAt','scheduledAt','legacyHtml','readingTimeMinutes','format']) assert.deepEqual(saved[field],post[field] instanceof Date?post[field].toISOString():post[field]);checks++;
    const latest=await state(post.id);assert.equal(latest.revisions.length,2);assert.equal(latest.revisions[0].snapshot.content,content);
    const event=latest.events.find(e=>e.type==='image_remove');assert.ok(event);assert.equal(event.actorName,`API: ${keys[0].name}`);assert.equal(event.source,'api');assert.ok(event.comment.includes(url)&&event.comment.includes('Удалена таблица-дубль'));assert.equal(event.revisionId,latest.revisions[1].id);checks++;
    const publicAfter=await page(post.slug);assert.ok(!publicAfter.body.includes(url));
    for(const field of ['headings','tables','links','dates','jsonld'])assert.deepEqual(publicAfter[field],publicBefore[field],field);
    assert.equal(await lastmod(post.slug),sitemapBefore);checks++;
    const stable=await state(post.id);
    await patch(post.id,{version:0,url,remove:true},409);
    assert.deepEqual(await state(post.id),stable);
    await request(`/api/admin/blog/${post.id}/restore`,{revisionId:latest.revisions[0].id,expectedUpdatedAt:saved.updatedAt},{admin:true});
    assert.equal((await db.blogPost.findUniqueOrThrow({where:{id:post.id}})).content,content);checks++;
    // Two independent tokens force the actual article CAS, rather than token-level serialization.
    const responses=await Promise.all(keys.map(key=>fetch(origin+path+'/images',{method:'PATCH',headers:{Authorization:`Bearer ${key.token}`,'Content-Type':'application/json'},body:JSON.stringify({version:2,url,remove:true,minorEdit:true})})));
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);await Promise.all(responses.map(r=>r.body?.cancel()));checks++;
  }
  const multi=await db.blogPost.create({data:{slug:prefix+'-duplicates',title:'Повторы',format:'html',content:`<img src="${url}" srcset="${url} 480w"><img src="/large" srcset="${url} 480w, /large 960w">`,contentUpdatedAt:then,updatedAt:then}});ids.push(multi.id);
  const beforeMulti=await state(multi.id);
  const conflict=await patch(multi.id,{version:0,url,remove:true},409);assert.equal(conflict.details.count,2);
  await request(`/api/v1/articles/${multi.id}/preview`,{imageRemoval:{url,remove:true}},{status:409});assert.deepEqual(await state(multi.id),beforeMulti);
  const all=(await patch(multi.id,{version:0,url,remove:true,all:true})).data;assert.equal(all.content,'');assert.notEqual(all.contentUpdatedAt,then.toISOString());checks++;
  await db.blogApiToken.update({where:{id:keys[0].id},data:{windowStartedAt:new Date(),requestCount:60}});
  await patch(multi.id,{version:1,url,remove:true},429);
  await db.blogApiToken.update({where:{id:keys[0].id},data:{requestCount:0,revokedAt:new Date()}});
  await patch(multi.id,{version:1,url,remove:true},401);
  console.log(JSON.stringify({ok:true,checks,formats:['html','markdown'],cases:['byte equality','CAS across tokens','minorEdit dates','public headings/tables/links/JSON-LD/sitemap','admin restore','preview CSRF','duplicates/srcset','401/400/404/409/429']}));
} finally {
  await db.blogEvent.deleteMany({where:{OR:[{postId:{in:ids}},{postId:{in:keys.map(k=>`token:${k.id}`)}}]}});
  await db.blogRevision.deleteMany({where:{postId:{in:ids}}});
  await db.blogPost.deleteMany({where:{id:{in:ids}}});
  await db.blogApiToken.deleteMany({where:{id:{in:keys.map(k=>k.id)}}});
  await db.user.delete({where:{id:admin.id}});
  await db.$disconnect();
}
