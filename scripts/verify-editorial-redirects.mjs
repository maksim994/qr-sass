// Read-only HTTP baseline of the pre-existing editorial redirects.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BLOG_REDIRECTS } from '../src/lib/blog-redirects.ts';
const origin=process.env.BLOG_VERIFY_ORIGIN||process.env.APP_URL||'https://qr-s.ru';
const results=[];
for(const [source,target] of Object.entries(BLOG_REDIRECTS)) {
 const path=`/blog/${source}?tz06=baseline`;
 const r=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(30000)});
 const location=new URL(r.headers.get('location')||'/',origin);
 results.push({path,status:r.status,location:location.pathname+location.search});
 await r.body?.cancel();
 assert.equal(r.status,301); assert.equal(location.pathname,`/blog/${target}`); assert.equal(location.search,'?tz06=baseline');
}
if(process.argv[2]==='--compare')assert.deepEqual(results,JSON.parse(await readFile(process.argv[3],'utf8')));
console.log(JSON.stringify(results));
