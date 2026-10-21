import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const origin = 'http://127.0.0.1:3010';
const response = await fetch(`${origin}/skaner-qr-koda`);
assert.equal(response.status,200);
const document = new JSDOM(await response.text()).window.document;
assert.equal(document.querySelectorAll('h1').length,1);
assert.equal(document.querySelector('h1').textContent,'Сканер QR-кода онлайн');
assert.equal(document.title,'Сканер QR-кода онлайн: с камеры, по фото и скриншоту | qr-s.ru');
assert.equal(document.querySelector('link[rel=canonical]').href,`${origin}/skaner-qr-koda`);
const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script=>{
  const value=JSON.parse(script.textContent);return value['@graph']??[value];
});
const faq=structured.find(item=>item['@type']==='FAQPage');
assert.equal(faq.mainEntity.length,11);
const details=[...document.querySelectorAll('main details')];
assert.equal(details.length,11);
details.forEach((detail,index)=>{
  assert.equal(detail.querySelector('summary').textContent,faq.mainEntity[index].name);
  assert.equal(detail.querySelector('p').textContent,faq.mainEntity[index].acceptedAnswer.text);
});
assert.equal(structured.find(item=>item['@type']==='WebApplication').offers.price,'0');
const sitemap=await(await fetch(`${origin}/sitemap.xml`)).text();
assert.equal(sitemap.split(`${origin}/skaner-qr-koda`).length-1,1);
const routes=JSON.parse(await fs.readFile(new URL('../public-design-2026-10-21/routes.json',import.meta.url)));
let footers=0;
for(const path of routes) {
  const page=new JSDOM(await(await fetch(origin+path)).text()).window.document;
  if(page.querySelector('footer')) {
    assert.ok(page.querySelector('footer a[href="/skaner-qr-koda"]'),`scanner footer link: ${path}`);
    footers++;
  }
}
const output={status:200,title:document.title,canonical:document.querySelector('link[rel=canonical]').href,faqItems:11,faqMatchesVisibleContent:true,sitemapOccurrences:1,footersChecked:footers,headers:{csp:response.headers.get('content-security-policy'),hsts:response.headers.get('strict-transport-security'),poweredBy:response.headers.get('x-powered-by')}};
await fs.writeFile(new URL('./http-checks.json',import.meta.url),JSON.stringify(output,null,2));
console.log(JSON.stringify(output));
