// Explicit release smoke: only newly created, named synthetic fixtures are mutated.
// Run in the full builder image with the existing app environment; never print credentials.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { getDb } from '../src/lib/db.ts';
import { createBlogApiToken, revokeBlogApiToken } from '../src/lib/blog-api-tokens.ts';
import { deleteEditorialRedirect } from '../src/lib/editorial-redirects.ts';
import { deleteFile } from '../src/lib/s3.ts';
assert.equal(process.env.BLOG_ASSETS_PRODUCTION_SMOKE,'explicit-stage4-fixtures-only');
assert.equal(new URL(process.env.APP_URL).origin,'https://qr-s.ru');
assert.equal(new URL(process.env.S3_PUBLIC_URL||process.env.S3_ENDPOINT).hostname,'s3.mvmolkov.ru');
const db=getDb(), origin=(process.env.BLOG_TEST_ORIGIN||process.env.APP_URL).replace(/\/+$/, '');
const run=Date.now(), slug=`tz06-assets-acceptance-${run}`, source=`/tz06-assets-check-${run}`;
const admin=await db.user.findFirst({where:{isAdmin:true},select:{id:true}});
assert.ok(admin);
const actor={actorId:admin.id,actorName:'Проверка выпуска этапа 4',source:'admin'};
let key,post,image,redirect; let passed=false;
async function api(path,method='GET',body) {
 const r=await fetch(origin+path,{method,headers:{Authorization:`Bearer ${key.token}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(60000)});
 const result=await r.json(); assert.ok(r.ok,`API ${method} ${path}: ${r.status}`); assert.equal(result.ok,true);return result.data;
}
try {
 key=await createBlogApiToken('Проверка выпуска этапа 4 (служебный)',actor);
 post=await api('/api/v1/articles','POST',{title:'Служебная проверка изображений — удалить после проверки',slug,format:'markdown',content:'## Проверка этапа 4',comment:'Изолированная служебная проверка на новом черновике'});
 assert.equal(post.status,'draft');
 const png=await sharp({create:{width:1800,height:900,channels:3,background:'#277f76'}}).png().toBuffer();
 const form=new FormData();form.set('file',new File([png],'stage4-check.png',{type:'image/png'}));form.set('alt','Служебное изображение этапа 4');form.set('kind','content');form.set('version',String(post.version));
 const uploaded=await api(`/api/v1/articles/${post.id}/images`,'POST',form);image=uploaded.image;post=uploaded.article;
 assert.deepEqual(image.variants.map(v=>v.width),[480,960,1600]);
 for(const variant of image.variants){const r=await fetch(variant.url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const meta=await sharp(Buffer.from(await r.arrayBuffer())).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,variant.width);assert.equal(meta.height,variant.height);}
 post=await api(`/api/v1/articles/${post.id}/images`,'PATCH',{version:post.version,url:image.url,alt:'Проверенный alt этапа 4',comment:'Проверка точечного alt'});
 assert.ok(post.content.includes('Проверенный alt этапа 4'));assert.ok(post.content.includes('srcset='));assert.equal(post.status,'draft');
 redirect=await api('/api/v1/redirects','POST',{source,target:'/blog/qr-kod-oplata-sbp',comment:'Служебная проверка, удаляется сразу после теста'});
 const response=await fetch(origin+source+'?test=stage4',{redirect:'manual'});assert.equal(response.status,301);assert.equal(new URL(response.headers.get('location')).pathname,'/blog/qr-kod-oplata-sbp');assert.equal(new URL(response.headers.get('location')).search,'?test=stage4');await response.body?.cancel();
 assert.ok((await api('/api/v1/redirects')).some(r=>r.id===redirect.id));
 passed=true;
} finally {
 if(redirect)await deleteEditorialRedirect(redirect.id,actor);
 // A failure after S3 commit can still be recovered by the fixture's API actor.
 const images=await db.blogImage.findMany({where:{actorName:'API: Проверка выпуска этапа 4 (служебный)',createdAt:{gte:new Date(run)}}});
 for(const owned of images){for(const variant of owned.variants)await deleteFile(variant.key);await db.blogImage.delete({where:{id:owned.id}});}
 const fixture=post?.id?await db.blogPost.findUnique({where:{id:post.id}}):await db.blogPost.findUnique({where:{slug}});
 if(fixture){assert.equal(fixture.slug,slug);assert.equal(fixture.status,'draft');assert.equal(fixture.publishedAt,null);await db.$transaction(async tx=>{await tx.blogPost.delete({where:{id:fixture.id}});await tx.blogEvent.create({data:{postId:fixture.id,postTitle:fixture.title,...actor,type:'delete',fields:[],comment:'Удалён только служебный черновик после проверки этапа 4; история сохранена'}});});}
 if(key)await revokeBlogApiToken(key.id,actor);
 assert.equal(await db.blogPost.count({where:{slug}}),0);assert.equal(await db.blogRedirect.count({where:{source}}),0);
 await db.$disconnect();
}
console.log(JSON.stringify({ok:passed,webpWidths:[480,960,1600],publicS3:true,apiAltVersion:true,redirect301Query:true,fixtureRemoved:true,ownTokenRevoked:true}));
