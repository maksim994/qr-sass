import assert from "node:assert/strict";
import {test} from "node:test";
import {sanitizeBlogFields,sanitizeBlogHtml} from "@/lib/blog-sanitize";
import {BLOG_REDIRECTS} from "@/lib/blog-redirects";
test("ranked print and VK article titles are preserved",()=>{
 for(const slug of ["razmer-qr-koda-dlya-pechati","qr-kod-dlya-vkontakte"]){
  const post={slug,title:"Existing ranked title",metaTitle:"Existing SEO title"};
  assert.deepEqual(sanitizeBlogFields(post),{...post,excerpt:undefined,metaDescription:undefined,content:undefined,structuredData:undefined});
 }
});
test("previously rendered CSV notice is refreshed and repeated rendering stays idempotent",()=>{
 const html='<p><strong>Как это сделано в QR-S.ru.</strong> Пакет из CSV есть, лимит строк за загрузку зависит от тарифа (50 / 1000 / 5000). Это не тысячи кодов за минуту и не отдельная очередь.</p>';
 const clean=sanitizeBlogHtml(html,"massovaya-generaciya-qr-kodov");
 assert.doesNotMatch(clean,/1000|5000/);
 assert.equal(sanitizeBlogHtml(clean,"massovaya-generaciya-qr-kodov"),clean);
});
test("editorial redirects have no chains or self redirects",()=>{
 for(const [source,target] of Object.entries(BLOG_REDIRECTS)){
  assert.notEqual(source,target);assert.equal(BLOG_REDIRECTS[target],undefined);
 }
});
