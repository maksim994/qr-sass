// Read-only production HTTP acceptance; local fixture article replaced with its real counterpart.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { PRIVACY_SECTIONS, TERMS_SECTIONS, CONSENT_SECTIONS } from '../../src/lib/legal-documents.ts';
const origin='https://qr-s.ru';
const routes=JSON.parse(readFileSync(new URL('../public-design-2026-10-21/routes.json',import.meta.url),'utf8')).map(path=>path==='/blog/preview-contact'?'/blog/qr-kod-s-logotipom-brenda':path);
const out=[];const styles=new Set();const normalize=s=>s.replace(/\s+/gu,' ').trim();
const legal=new Map([['/privacy-policy',PRIVACY_SECTIONS],['/terms-of-service',TERMS_SECTIONS],['/personal-data-consent',CONSENT_SECTIONS]]);
for(const path of routes){
 const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,200,path);
 const doc=new JSDOM(await r.text()).window.document;
 assert.equal(doc.querySelectorAll('h1').length,1,path+' H1');
 assert.ok(doc.querySelector('.qrs-public'),path+' public shell');
 for(const el of doc.querySelectorAll('link[rel="stylesheet"]'))styles.add(el.getAttribute('href'));
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,path+' duplicate id');
 if(legal.has(path)){
  const paragraphs=[...doc.querySelectorAll('article p')].map(e=>normalize(e.textContent));
  for(const section of legal.get(path))for(const text of section.paragraphs)assert.ok(paragraphs.includes(normalize(text)),path+' exact legal paragraph');
  for(const a of doc.querySelectorAll('a[href^="#"]'))assert.ok(doc.getElementById(a.getAttribute('href').slice(1)),path+' contents target');
 }
 if(path==='/terms-of-service')for(const id of ['payment','refund','acceptance'])assert.ok(doc.getElementById(id),id);
 if(path==='/privacy-policy')assert.equal(doc.getElementById('cookie-settings').tagName,'BUTTON');
 if(path==='/pricing'){
  for(const plan of ['free','pro','business'])assert.ok(doc.querySelector(`a[href="/register?plan=${plan}"]`));
  assert.equal(doc.querySelectorAll('table thead th').length,4);
 }
 if(path==='/contacts')assert.ok(doc.querySelector('a[href="https://t.me/m_mvmolkov"]'));
 if(path==='/reset-password')assert.ok(doc.querySelector('button[type="submit"]').disabled);
 out.push({path,status:r.status,h1:doc.querySelector('h1').textContent,passed:true});
}
let publicCss=false;
for(const href of styles){const r=await fetch(origin+href);assert.equal(r.status,200,href);if((await r.text()).includes('.qrs-public-heading'))publicCss=true;}
assert.ok(publicCss,'Shared public CSS must be present in the actual served stylesheets');
const missing=await fetch(origin+'/design-preview-not-found');assert.equal(missing.status,404);assert.ok((await missing.text()).includes('Страница не найдена'));
const word=await fetch(origin+'/documents/oferta-qr-s-2026-10-06.docx');assert.equal(word.status,200);
const invariants=[];
for(const path of ['src/lib/legal-documents.ts','src/lib/commercial-config.ts','src/lib/plans.ts','src/lib/auth.ts','src/middleware.ts','prisma/schema.prisma']){
 const bytes=readFileSync(path);assert.deepEqual(bytes,execFileSync('git',['show','HEAD:'+path]));invariants.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),unchanged:true});
}
writeFileSync(new URL('./public-checks.json',import.meta.url),JSON.stringify({routes:out,notFound:404,wordDownload:200,publicCssServed:publicCss,invariants},null,2));
console.log(JSON.stringify({passed:out.length,notFound:404,wordDownload:200,publicCssServed:publicCss,unchangedContracts:invariants.length}));
