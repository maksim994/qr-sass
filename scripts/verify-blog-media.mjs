// Synthetic records only, in a named local database or this task's internal restored copy.
import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {getDb} from '../src/lib/db.ts';
import {createBlogApiToken} from '../src/lib/blog-api-tokens.ts';
import {uploadFile,deleteFile} from '../src/lib/s3.ts';
const origin=process.env.BLOG_TEST_ORIGIN||process.env.APP_URL;
const database=new URL(process.env.DATABASE_URL);
assert.equal(database.pathname,'/qr_tz08');
assert.ok(['localhost','127.0.0.1','qr-tz08-media-postgres'].includes(database.hostname));
assert.ok(process.env.JWT_SECRET?.startsWith('local-tz06-'));
assert.ok(['localhost','127.0.0.1','qr-tz08-media-candidate'].includes(new URL(origin).hostname));
const db=getDb(),prefix=`tz08-media-${Date.now()}`,keys=[],posts=[],images=[];
const admin=await db.user.create({data:{email:prefix+'@example.invalid',passwordHash:'unusable',isAdmin:true}});
const session=await new SignJWT({email:admin.email,sv:admin.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(admin.id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET));
let token,checks=0;
async function request(path,method='GET',body,adminAuth=false,status=200) {
 const response=await fetch(origin+path,{method,headers:{...(adminAuth?{Cookie:`qr_saas_session=${session}; csrf_token=tz08-media`,Origin:origin,'x-csrf-token':'tz08-media'}:{Authorization:`Bearer ${token.token}`}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual'});
 const json=await response.json();assert.equal(response.status,status,json.error);checks++;return json.data;
}
async function media(path,type='image/webp') {
 const response=await fetch(origin+path,{headers:{Cookie:'qr_saas_session=not-forwarded'},redirect:'manual'});
 assert.equal(response.status,200,path);assert.equal(response.headers.get('content-type'),type);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');
 const etag=response.headers.get('etag'),last=response.headers.get('last-modified');assert.ok(etag&&last);const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length);assert.equal(response.headers.get('content-length'),String(bytes.length));
 const head=await fetch(origin+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('etag'),etag);assert.equal(await head.text(),'');
 const conditional=await fetch(origin+path,{headers:{'If-None-Match':etag}});assert.equal(conditional.status,304);assert.equal(await conditional.text(),'');checks+=3;return bytes;
}
const then=new Date('2026-07-14T08:00:00Z');
try {
 token=await createBlogApiToken(prefix,{actorId:admin.id,actorName:'ТЗ-08 media',source:'admin'});
 const png=await sharp({create:{width:1800,height:1000,channels:3,background:'#126a9b'}}).png().toBuffer();
 const form=()=>{const f=new FormData();f.set('file',new File([png],prefix+'.png',{type:'image/png'}));f.set('alt','Проверка media');return f;};
 const uploaded=await request('/api/v1/images','POST',form(),false,201);images.push(uploaded);
 assert.deepEqual(uploaded.variants.map(v=>v.width),[480,960,1600]);
 for(const v of uploaded.variants){const u=new URL(v.url);assert.equal(u.origin,new URL(process.env.APP_URL).origin);assert.ok(u.pathname.startsWith('/media/blog/content/'));const bytes=await media(u.pathname);const m=await sharp(bytes).metadata();assert.equal(m.width,v.width);assert.equal(m.height,v.height);}
 assert.ok(!uploaded.figure.includes('s3.mvmolkov.ru'));assert.ok(uploaded.srcset.includes('/media/blog/content/'));
 const adminImage=await request('/api/admin/blog/upload','POST',form(),true,201);images.push(adminImage);assert.ok(adminImage.url.includes('/media/blog/covers/'));await media(new URL(adminImage.url).pathname);
 for(const [ext,type]of [['png','image/png'],['jpg','image/jpeg'],['gif','image/gif']]){const key=`qr/blog/content/${prefix}.${ext}`;keys.push(key);const bytes=await sharp(png).toFormat(ext==='jpg'?'jpeg':ext).toBuffer();await uploadFile(bytes,key,type,'public');assert.deepEqual(await media('/media/blog/content/'+prefix+'.'+ext,type),bytes);}
 const legacyUrl=`https://s3.mvmolkov.ru/qr/blog/content/${prefix}-legacy.webp`,legacyKey=`qr/blog/content/${prefix}-legacy.webp`;keys.push(legacyKey);await uploadFile(await sharp(png).webp().toBuffer(),legacyKey,'image/webp','public');
 for(const format of ['html','markdown']) {
  const content=format==='html'?`<h2 id="keep">До</h2><p>Текст  &amp; пробелы</p><figure><img src="${legacyUrl}" alt="Таблица"></figure><table><tr><td>1</td></tr></table><a href="/blog/x">Ссылка</a>`:`## До {#keep}\n\n![Таблица](${legacyUrl})\n\n| A |\n|---|\n|1|\n\n[Ссылка](/blog/x)`;
  const post=await db.blogPost.create({data:{slug:`${prefix}-${format}`,title:`Media ${format}`,content,format,publishedAt:then,firstPublishedAt:then,contentUpdatedAt:then,updatedAt:then,status:'published',coverImageUrl:adminImage.url,faq:[]}});posts.push(post.id);
  const page=await fetch(origin+'/blog/'+post.slug);assert.equal(page.status,200);const html=await page.text();assert.ok(!html.includes('s3.mvmolkov.ru'));const dom=new JSDOM(html),doc=dom.window.document;
  for(const prop of ['og:image','twitter:image']) {const value=doc.querySelector(`meta[property="${prop}"],meta[name="${prop}"]`)?.getAttribute('content');assert.ok(value?.includes('/media/blog/covers/'),prop);}
  const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]')?.textContent)['@graph'];const article=graph.find(n=>n['@type']==='BlogPosting');assert.equal(article.image['@type'],'ImageObject');assert.equal(article.image.width,adminImage.width);assert.equal(article.image.height,adminImage.height);assert.equal(article.dateModified,then.toISOString());
  assert.ok(doc.querySelector('.qrs-body img').getAttribute('src').includes('/media/blog/content/'));dom.window.close();
  const preview=await request('/api/v1/articles/'+post.id+'/preview','POST',{});assert.ok(!preview.html.includes('s3.mvmolkov.ru'));
  const raw=await db.blogPost.findUniqueOrThrow({where:{id:post.id}});assert.equal(raw.content,content);assert.equal(raw.contentUpdatedAt.toISOString(),then.toISOString());assert.equal(raw.updatedAt.toISOString(),then.toISOString());
  const xml=await(await fetch(origin+'/sitemap.xml')).text();const sitemap=new JSDOM(xml,{contentType:'text/xml'});const entry=[...sitemap.window.document.querySelectorAll('url')].find(n=>n.querySelector('loc')?.textContent.endsWith('/blog/'+post.slug));assert.ok(entry);assert.equal(entry.querySelector('lastmod').textContent,then.toISOString());const locations=[...entry.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1','loc')].map(n=>n.textContent);assert.ok(locations.length>=2);assert.ok(locations.every(u=>u.includes('/media/blog/')));sitemap.window.close();checks++;
  const removed=await request('/api/v1/articles/'+post.id+'/images','PATCH',{version:0,url:new URL(legacyUrl).pathname.replace('/qr/blog/','/media/blog/'),remove:true,minorEdit:true});assert.equal(removed.contentUpdatedAt,then.toISOString());assert.ok(!removed.content.includes(legacyUrl));
  // Article-scoped uploads share the same public image contract.
  const coverForm=form();coverForm.set('kind','cover');coverForm.set('version',String(removed.version));const added=await request('/api/v1/articles/'+post.id+'/images','POST',coverForm,false,201);images.push(added.image);assert.ok(added.image.url.includes('/media/blog/covers/'));await media(new URL(added.image.url).pathname);
 }
 for(const path of ['/media/blog/content/no-such-tz08.webp','/media/blog/covers/%252e%252e.webp','/media/blog/other/file.webp','/media/blog/content/file.svg','/media/blog/content/%2fetc%2fpasswd.webp']){const r=await fetch(origin+path,{redirect:'manual'});assert.ok([400,404].includes(r.status),path+':'+r.status);assert.ok(!(await r.text()).includes('s3.mvmolkov.ru'));checks++;}
 const robots=await(await fetch(origin+'/robots.txt')).text();assert.ok(robots.includes('Allow: /media/'));checks++;
 console.log(JSON.stringify({ok:true,checks,formats:['html','markdown'],newUploadEndpoints:3,conditional:true,immutable:true,sourceAndDatesPreserved:true,sitemapImages:true}));
} finally {
 for(const image of images){keys.push(...image.variants.map(v=>v.key));await db.blogImage.deleteMany({where:{id:image.id}});}
 await Promise.all(keys.map(deleteFile));
 await db.blogRevision.deleteMany({where:{postId:{in:posts}}});await db.blogPost.deleteMany({where:{id:{in:posts}}});
 await db.blogEvent.deleteMany({where:{OR:[{postId:{in:posts}},{postId:{in:images.map(x=>'image:'+x.id)}},...(token?[{postId:'token:'+token.id}]:[])]}});
 if(token)await db.blogApiToken.delete({where:{id:token.id}});await db.user.delete({where:{id:admin.id}});await db.$disconnect();
}
