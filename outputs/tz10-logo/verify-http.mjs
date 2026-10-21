import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const origin='http://127.0.0.1:3010';
const results=[];
for(const [path,count] of [['/qr-s-logotipom',5],['/skaner-qr-koda',11]]) {
  const response=await fetch(origin+path);
  assert.equal(response.status,200);
  const document=new JSDOM(await response.text()).window.document;
  assert.equal(document.querySelectorAll('h1').length,1);
  assert.equal(document.querySelector('link[rel=canonical]').href,origin+path);
  const graph=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script=>{const v=JSON.parse(script.textContent);return v['@graph']??[v];});
  const faq=graph.find(item=>item['@type']==='FAQPage');
  assert.equal(faq.mainEntity.length,count);
  const details=[...document.querySelectorAll('main details')].filter(detail=>detail.querySelector('p'));
  const questionDetails=details.filter(detail=>faq.mainEntity.some(q=>q.name===detail.querySelector('summary')?.textContent));
  assert.equal(questionDetails.length,count);
  questionDetails.forEach((detail,index)=>{
    assert.equal(detail.querySelector('summary').textContent,faq.mainEntity[index].name);
    assert.equal(detail.querySelector('p').textContent,faq.mainEntity[index].acceptedAnswer.text);
  });
  if(path==='/skaner-qr-koda') {
    const description='Отсканируй QR-код камерой телефона или ноутбука, загрузи фото или вставь скриншот через Ctrl+V. Без регистрации, изображение не покидает браузер. Ссылки, Wi-Fi, контакты.';
    assert.equal(document.title,'Сканер QR-кода онлайн: с камеры, по фото и скриншоту | qr-s.ru');
    assert.equal(document.querySelector('meta[name=description]').content,description);
    assert.equal(document.querySelector('meta[property="og:description"]').content,description);
    assert.ok(document.querySelector('main>header').textContent.includes('Наведи камеру, загрузи фото или вставь скриншот: код распознается прямо в браузере.'));
    assert.deepEqual([...document.querySelectorAll('main>div section>h2')].map(e=>e.textContent),['Как отсканировать QR-код онлайн','С телефона, с компьютера, со скриншота','Что может быть в QR-коде и как проверить ссылку','Почему QR-код не сканируется','Вопросы и ответы']);
    assert.equal(document.querySelectorAll('main a[href="/blog/qr-kod-ne-skaniiruetsya-ispravit"]').length,2);
  } else {
    assert.ok(document.querySelector('form#create-qr input[type=file]'));
    assert.ok(document.querySelector('form#create-qr').textContent.includes('Коррекция H включена автоматически'));
    assert.equal(document.querySelector('meta[name=keywords]'),null);
    assert.equal(graph.find(item=>item['@type']==='SoftwareApplication').offers.price,'0');
  }
  results.push({path,status:200,title:document.title,faq:count,faqMatches:true,canonical:origin+path});
}
const sitemap=await(await fetch(origin+'/sitemap.xml')).text();
for(const path of ['/qr-s-logotipom','/skaner-qr-koda'])assert.equal(sitemap.split(origin+path).length-1,1);
await fs.writeFile(new URL('./http-checks.json',import.meta.url),JSON.stringify({results,sitemapUnique:true,scannerApprovedCopy:true},null,2));
console.log(JSON.stringify(results));
