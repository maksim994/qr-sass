// Optional QA runtime; install Playwright outside the application and pass its module path.
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(process.env.BLOG_TEST_FIXTURE || '/tmp/qr-tz09-fixture.json','utf8'));
assert.ok(['localhost','127.0.0.1'].includes(new URL(fixture.origin).hostname), 'Local synthetic fixture required');
const dir=process.env.BLOG_TEST_OUTPUT || 'outputs/tz09';mkdirSync(dir,{recursive:true});
const results=[];
for(const [engine,type,options] of [['chrome',chromium,{channel:'chrome'}],['webkit',webkit,{}]]){
 const browser=await type.launch({headless:true,...options});
 for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  for(const theme of ['light','dark']){
   await page.addInitScript(theme=>{localStorage.setItem('qrs-theme',theme);document.documentElement.setAttribute('data-theme',theme)},theme);
   await page.goto(fixture.origin,{waitUntil:'networkidle'});
   await page.evaluate(theme=>{document.documentElement.setAttribute('data-theme',theme)},theme);
   const block=page.locator('[class*="footerStart"]');await block.scrollIntoViewIfNeeded();
   const data=await block.evaluate(el=>{
    function color(css){const c=document.createElement('canvas').getContext('2d');c.fillStyle=css;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3)}
    function lum(rgb){return rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
    const bg=getComputedStyle(el).backgroundColor;
    const contrast=(fg,bg)=>{const [a,b]=[lum(color(fg)),lum(color(bg))].sort((a,b)=>b-a);return(a+.05)/(b+.05)};
    const text=[...el.querySelectorAll('h2,p,strong,small,button,a,span')].filter(n=>n.textContent.trim()).map(n=>{const s=getComputedStyle(n);let bgNode=n;while(bgNode!==el&&getComputedStyle(bgNode).backgroundColor==='rgba(0, 0, 0, 0)')bgNode=bgNode.parentElement;const ownBg=getComputedStyle(bgNode).backgroundColor;return {text:n.textContent.trim().slice(0,60),fg:s.color,bg:ownBg,contrast:contrast(s.color,ownBg)}});
    return{heading:getComputedStyle(el.querySelector('h2')).color,bg,text,overflow:document.documentElement.scrollWidth>innerWidth,theme:document.documentElement.getAttribute('data-theme')};
   });
   assert.ok(!data.overflow,`${engine} ${width} overflow`);
   assert.ok(data.text.every(t=>t.contrast>=4.5),JSON.stringify({engine,width,theme,data}));
   await block.screenshot({path:`${dir}/home-${engine}-${width}-${theme}.png`});
   results.push({page:'/',engine,width,theme,...data});
  }
  for(const path of ['/blog','/blog?category=guides','/blog?page=2']){
   await page.goto(fixture.origin+path,{waitUntil:'networkidle'});
   const data=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('main article')];const nav=document.querySelector('nav[aria-label="Пагинация блога"]');
    const last=Math.max(...cards.map(c=>c.getBoundingClientRect().bottom));
    return{count:cards.length,featured:!!document.querySelector('.qrs-featured-grid'),margin:parseFloat(getComputedStyle(nav).marginTop),gap:nav.getBoundingClientRect().top-last,bottom:document.querySelector('footer').getBoundingClientRect().top-nav.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth,cards:cards.map(c=>{const b=c.getBoundingClientRect();return {width:b.width,height:b.height,top:b.top}})};
   });
   assert.equal(data.count,9);assert.equal(data.featured,false);assert.equal(data.margin,width===375?32:48);assert.ok(data.gap>=data.margin-1);assert.ok(data.bottom>=32);assert.equal(data.overflow,false);
   for(const card of data.cards){assert.ok(Math.abs(card.width-data.cards[0].width)<1);assert.ok(Math.abs(card.height-data.cards[0].height)<1);}
   await page.screenshot({path:`${dir}/blog-${engine}-${width}-${path.includes('category')?'category':path.includes('page=')?'page2':'page1'}.png`,fullPage:true});results.push({page:path,engine,width,...data});
  }
  await context.addCookies([{name:'qr_saas_session',value:fixture.session,url:fixture.origin},{name:'csrf_token',value:'tz09',url:fixture.origin}]);
  await page.goto(`${fixture.origin}/admin/blog/${fixture.postId}/edit`,{waitUntil:'networkidle'});
  const panel=page.locator('#pending-revision');await panel.getByText('Сравнить с живой версией',{exact:true}).click();await panel.scrollIntoViewIfNeeded();
  assert.ok(await panel.locator('ins').count());assert.ok(await panel.locator('del').count());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await panel.screenshot({path:`${dir}/admin-${engine}-${width}.png`});
  await panel.getByRole('button',{name:'Предпросмотр черновика',exact:true}).click();
  await panel.getByRole('link',{name:'Открыть предпросмотр →'}).waitFor();
  const previewPath=await panel.getByRole('link',{name:'Открыть предпросмотр →'}).getAttribute('href');
  const preview=await context.newPage();await preview.goto(fixture.origin+previewPath);assert.ok((await preview.locator('main').innerText()).includes('Новый текст для сравнения'));await preview.close();
  results.push({page:'admin pending diff and preview',engine,width,passed:true});
  await context.close();
 }
 await browser.close();
}
writeFileSync(`${dir}/ui.json`,JSON.stringify(results,null,2)+'\n');console.log(`UI: ${results.length} viewport/route/theme checks passed.`);
