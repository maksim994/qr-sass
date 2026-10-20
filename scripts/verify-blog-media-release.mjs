// Read-only release baseline/compare. Keep snapshots mode 0600 outside Git.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {getDb} from '../src/lib/db.ts';
import {isDeniedSitemapPath} from '../src/lib/seo-hygiene.ts';
import {rewriteBlogMediaHtml} from '../src/lib/blog-media-html.ts';
const db=getDb(),origin=(process.env.BLOG_VERIFY_ORIGIN||process.env.APP_URL).replace(/\/+$/,'');
const comparing=process.argv[2]==='--compare';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seen=new Set();let imagesChecked=0,oldUrlsChecked=0;
async function checkImage(value){
 const parsed=new URL(value,origin);let path=parsed.pathname+parsed.search;
 if(parsed.pathname==='/_next/image'){const target=parsed.searchParams.get('url');if(!target)return;const u=new URL(target,origin);if(!u.pathname.startsWith('/media/blog/'))return;path=u.pathname+u.search;}
 if(!path.startsWith('/media/blog/')||seen.has(path))return;seen.add(path);
 const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/^image\/(webp|png|jpeg|gif)$/);assert.match(response.headers.get('cache-control'),/max-age=31536000.*immutable/);assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('location'),null);
 const etag=response.headers.get('etag');assert.ok(etag);assert.ok(response.headers.get('last-modified'));await response.arrayBuffer();
 const head=await fetch(origin+path,{method:'HEAD',signal:AbortSignal.timeout(30000)});assert.equal(head.status,200);assert.equal(head.headers.get('etag'),etag);
 const conditional=await fetch(origin+path,{headers:{'If-None-Match':etag},signal:AbortSignal.timeout(30000)});assert.equal(conditional.status,304);await conditional.body?.cancel();imagesChecked++;
}
try{
 const rows=await db.blogPost.findMany({orderBy:{slug:'asc'}});
 const records=Object.fromEntries(rows.map(row=>{const stable={...row};delete stable.views;delete stable.likes;return[row.id,hash(stable)];}));
 const dates=Object.fromEntries(rows.map(row=>[row.slug,{contentUpdatedAt:row.contentUpdatedAt?.toISOString()??null,updatedAt:row.updatedAt.toISOString()}]));
 const published=rows.filter(r=>r.publishedAt&&!isDeniedSitemapPath('/blog/'+r.slug));
 const wanted=['razmer-qr-koda-dlya-pechati','self-hosted-sokrashhatel-vs-oblachnyj-qr','qr-kod-dlya-whatsapp'];
 const chosen=[...published.filter(r=>r.format==='markdown'),...wanted.map(slug=>published.find(r=>r.slug===slug)).filter(Boolean),...published].filter((row,i,all)=>all.findIndex(x=>x.id===row.id)===i).slice(0,5);
 assert.equal(chosen.length,5);const pages={};
 for(const row of chosen){
  const r=await fetch(origin+'/blog/'+row.slug,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,row.slug);const html=await r.text();const dom=new JSDOM(html),doc=dom.window.document;
  const body=doc.querySelector('.qrs-body');assert.ok(body,row.slug);
  pages[row.slug]={body:body.innerHTML,format:row.format,headings:[...body.querySelectorAll('h2')].map(h=>[h.id,h.textContent]),tables:[...body.querySelectorAll('table')].map(t=>t.outerHTML),links:[...body.querySelectorAll('a')].map(a=>a.outerHTML)};
  if(comparing){
   assert.ok(!/s3\.mvmolkov\.ru(?:\/|%2F)qr(?:\/|%2F)blog(?:\/|%2F)/i.test(html),row.slug+': old blog host in HTML');
   for(const prop of ['og:image','twitter:image']){const value=doc.querySelector(`meta[property="${prop}"],meta[name="${prop}"]`)?.getAttribute('content');assert.ok(value?.startsWith('https://qr-s.ru/media/blog/'),row.slug+': '+prop);}
   const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]')?.textContent)['@graph'];const article=graph.find(n=>n['@type']==='BlogPosting');assert.equal(article.image['@type'],'ImageObject');assert.ok(article.image.url.startsWith('https://qr-s.ru/media/blog/'));assert.ok(article.image.width>0&&article.image.height>0);assert.equal(article.dateModified,(row.contentUpdatedAt??row.updatedAt).toISOString());
   for(const img of doc.querySelectorAll('img')){await checkImage(img.getAttribute('src'));for(const candidate of (img.getAttribute('srcset')||'').split(','))await checkImage(candidate.trim().split(/\s+/)[0]||'/');}
   if(origin==='https://qr-s.ru'&&row.coverImageUrl?.startsWith('https://s3.mvmolkov.ru/qr/blog/')){const old=await fetch(row.coverImageUrl,{method:'HEAD',signal:AbortSignal.timeout(30000)});assert.equal(old.status,200,'legacy cover URL');oldUrlsChecked++;}
  }
  dom.window.close();
 }
 const xml=await(await fetch(origin+'/sitemap.xml')).text();const sitemap=new JSDOM(xml,{contentType:'text/xml'});const entries={};let imageEntries=0;
 for(const item of sitemap.window.document.querySelectorAll('url')){const url=[...item.children].find(n=>n.localName==='loc'&&n.namespaceURI==='http://www.sitemaps.org/schemas/sitemap/0.9')?.textContent;assert.ok(url);const path=new URL(url).pathname;const images=[...item.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1','loc')].map(n=>n.textContent);entries[path]={lastmod:item.querySelector('lastmod')?.textContent,images};if(images.length)imageEntries++;}
 sitemap.window.close();
 const robots=await(await fetch(origin+'/robots.txt')).text();
 if(comparing){
  const before=JSON.parse(await readFile(process.argv[3],'utf8'));assert.deepEqual(records,before.records,'all original source/dates');assert.deepEqual(dates,before.dates);
  assert.deepEqual(Object.keys(entries).sort(),Object.keys(before.entries).sort(),'sitemap URLs');
  for(const [path,entry]of Object.entries(entries)){assert.equal(entry.lastmod,before.entries[path].lastmod,path+': lastmod');if(path.startsWith('/blog/')){assert.ok(entry.images.length,path+': sitemap images');assert.ok(entry.images.every(u=>u.startsWith('https://qr-s.ru/media/blog/')),path+': image host');}}
  for(const [slug,page]of Object.entries(before.pages)){assert.ok(pages[slug]);assert.equal(pages[slug].body,rewriteBlogMediaHtml(page.body),slug+': body changes beyond image URLs');for(const field of ['headings','tables','links'])assert.deepEqual(pages[slug][field],page[field],slug+': '+field);}
  assert.ok(robots.includes('Allow: /media/'));
  for(const path of ['/media/blog/content/../..%2fetc%2fpasswd','/media/blog/other/file.webp','/media/blog/content/no-such-tz08-file.webp']){const r=await fetch(origin+path,{redirect:'manual'});assert.ok([400,404].includes(r.status),path);await r.body?.cancel();}
  console.log(JSON.stringify({ok:true,articleRecords:rows.length,indexableArticles:published.length,excludedLegacyAliases:rows.length-published.length,formats:Object.fromEntries(['html','markdown'].map(f=>[f,rows.filter(r=>r.format===f).length])),htmlCompared:chosen.length,imagesChecked,oldUrlsChecked,sitemapImageEntries:imageEntries,allDatesAndSourcesIdentical:true}));
 }else console.log(JSON.stringify({records,dates,pages,entries,formats:Object.fromEntries(rows.map(r=>[r.id,r.format]))}));
}finally{await db.$disconnect();}
