import assert from "node:assert/strict";
import { test } from "node:test";
import { blogMediaKey, blogMediaUrl, blogMediaUrlForKey, blogMediaImageSrc, sameBlogImageUrl } from "./blog-media-url.ts";
import { rewriteBlogMediaHtml, rewriteBlogMediaJsonLd, blogImageUrls } from "./blog-media-html.ts";
import { createBlogMediaHandler } from "./blog-media-http.ts";
import { renderArticleBody } from "./blog-render.ts";
import { replaceArticleImage } from "./blog-image-content.ts";
import { prepareArticleImageRemoval } from "./blog-image-removal.ts";
import { allowBlogMediaRobots } from "./blog-media-robots.ts";
import { buildArticleJsonLd } from "./blog-structured-data.ts";

const old = 'https://s3.mvmolkov.ru/qr/blog/content/test-960.webp';
const url = 'https://qr-s.ru/media/blog/content/test-960.webp';
test('public mapping is restricted, reversible for matching, and leaves other files/domains alone', () => {
  assert.equal(blogMediaUrl(old),url);
  assert.equal(blogMediaUrlForKey('qr/blog/content/test-960.webp'),url);
  assert.equal(blogMediaImageSrc(old),'/media/blog/content/test-960.webp');
  assert.ok(sameBlogImageUrl(old,url));assert.ok(!sameBlogImageUrl(old+'?x=1',url));
  for (const input of ['https://s3.mvmolkov.ru/qr/customer/x.webp','https://s3.mvmolkov.ru.evil/qr/blog/content/x.webp','https://example.org/qr/blog/content/x.webp',old.replace('https:','http:'),old.replace('s3.','user@s3.')]) assert.equal(blogMediaUrl(input),input);
  for (const parts of [['..','a.webp'],['content','..','a.webp'],['content','%2e%2e.webp'],['content','a.svg'],['content','a.webp/../../x'],['avatars','a.webp'],['content','a%2f.webp'],['content','a\\.webp'],['content','a.webp\0']]) assert.equal(blogMediaKey(parts),null);
});
test('only image URL attributes change; text, links, layout, dimensions and source remain intact', () => {
  const source=`<h2 id="keep">Раздел</h2>\n<p>${old} <a href="${old}">ссылка</a></p><img src="${old}" srcset="${old} 960w, https://example.org/x.webp 1600w" width="960" height="540" sizes="100vw"><table><tr><td>1</td></tr></table>`;
  const expected=source.replace(`src="${old}"`,`src="${url}"`).replace(`srcset="${old}`,`srcset="${url}`);
  assert.equal(rewriteBlogMediaHtml(source),expected);
  assert.deepEqual(blogImageUrls(expected,old),[url]);
  for (const format of ['html','markdown'] as const) {
    const body=renderArticleBody(format==='html'?source:`## Раздел {#keep}\n\n![alt](${old})` ,format);
    assert.ok(body.html.includes(`src="${url}"`));
    assert.ok(body.items.length>0);
  }
});
test('JSON-LD image objects and graph images change without rewriting dates or prose', () => {
  const data={image:[old,{'@type':'ImageObject',url:old,width:960,height:540}],description:old,dateModified:'2026-07-14T00:00:00Z'};
  assert.deepEqual(rewriteBlogMediaJsonLd(data),{...data,image:[url,{'@type':'ImageObject',url,width:960,height:540}]});
  const result=buildArticleJsonLd({base:'https://qr-s.ru',articleUrl:'https://qr-s.ru/blog/x',title:'x',seoTitle:'x',seoDescription:'x',coverImageUrl:old,coverImageWidth:960,coverImageHeight:540,publishedAt:new Date('2026-07-14'),updatedAt:new Date('2026-07-14'),likes:0,authorName:null,faq:[],structuredData:null});
  const graph=result['@graph'] as Record<string,unknown>[];
  assert.deepEqual(graph.find(x=>x['@type']==='BlogPosting')?.image,{'@type':'ImageObject',url,width:960,height:540});
});
test('stage-one deletion/replacement works with new public URLs against untouched legacy source', () => {
  const html=`<figure><img src="${old}"><figcaption>Подпись</figcaption></figure>`;
  assert.equal(prepareArticleImageRemoval(html,{url,remove:true},'html').content,'');
  assert.throws(()=>prepareArticleImageRemoval(html,{url,remove:true},'html',old),/coverImageUrl/);
  for(const format of ['html','markdown'] as const) {
    const source=format==='html'?html:`![alt](${old})`;
    const result=replaceArticleImage(source,{url,alt:'new'},format);
    assert.ok(result.found);assert.ok(result.content.includes(old));
  }
});
test('media GET/HEAD, immutable caching, conditional requests and cookie isolation', async () => {
  let calls=0;
  const body=Buffer.from('image-bytes'), date=new Date('2026-10-20T10:00:00Z');
  const media=createBlogMediaHandler(async (_key,head)=>{calls++;return {body:head?undefined:body,length:body.length,contentType:'image/webp',etag:'"test"',lastModified:date};});
  const parts=['content','test-960.webp'];
  const head=await media.handle(new Request(url,{method:'HEAD'}),parts);assert.equal(head.status,200);assert.equal(await head.text(),'');
  const get=await media.handle(new Request(url,{headers:{Cookie:'session=private'}}),parts);assert.equal(get.status,200);assert.equal(await get.text(),'image-bytes');
  assert.equal(get.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(get.headers.get('set-cookie'),null);assert.equal(get.headers.get('location'),null);assert.equal(get.headers.get('content-type'),'image/webp');assert.equal(get.headers.get('content-length'),String(body.length));
  for(const tag of ['"test"','W/"test"','"other", "test"','*']) {const r=await media.handle(new Request(url,{headers:{'If-None-Match':tag}}),parts);assert.equal(r.status,304);assert.equal(await r.text(),'');}
  assert.equal((await media.handle(new Request(url,{headers:{'If-Modified-Since':date.toUTCString()}}),parts)).status,304);
  assert.equal((await media.handle(new Request(url,{headers:{'If-None-Match':'"different"','If-Modified-Since':date.toUTCString()}}),parts)).status,200);
  assert.equal(calls,2);
});
test('media rejects traversal before storage; missing/error responses do not expose storage details',async()=>{
  let calls=0;const missing=createBlogMediaHandler(async()=>{calls++;return null;});
  assert.equal((await missing.handle(new Request(url),['..','customer.webp'])).status,404);assert.equal(calls,0);
  assert.equal((await missing.handle(new Request(url),['content','missing.webp'])).status,404);
  const broken=createBlogMediaHandler(async()=>{throw Error('private storage and credentials');});
  const response=await broken.handle(new Request(url),['content','test.webp']);assert.equal(response.status,502);assert.equal(await response.text(),'');assert.equal(response.headers.get('cache-control'),'no-store');
});
test('bounded media cache evicts old bodies and coalesces concurrent reads',async()=>{
  let calls=0;const media=createBlogMediaHandler(async()=>{calls++;await Promise.resolve();return {body:Buffer.from('1234'),length:4,contentType:'image/png'};},4,1);
  await Promise.all([0,1].map(()=>media.handle(new Request(url),['content','a.png'])));assert.equal(calls,1);
  await media.handle(new Request(url),['content','b.png']);await media.handle(new Request(url),['content','a.png']);assert.equal(calls,3);
});
test('robots explicitly permits media in all agent groups while retaining private-route rules',()=>{
  const robots=allowBlogMediaRobots('User-agent: *\nDisallow: /\n\nUser-agent: Yandex\nDisallow: /admin\nDisallow: /media/blog/\nSitemap: https://qr-s.ru/sitemap.xml');
  assert.equal(robots.match(/Allow: \/media\//g)?.length,3);assert.ok(robots.includes('Disallow: /admin'));assert.ok(!robots.includes('Disallow: /media'));
});
