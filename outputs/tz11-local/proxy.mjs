// Local test fixture: real Yandex URLs are replaced in JS, never contacted.
import http from 'node:http';
import {writeFileSync} from 'node:fs';
const origin='http://127.0.0.1:3013', upstream='http://127.0.0.1:3010';
const log=[];
const events=[];
const fixtureScript=`const el=document.createElement('script');el.type='application/json';el.id='tz11-events';el.textContent='[]';document.body.appendChild(el);const queued=window.ym?.a||[];window.ym=(...args)=>{const safe=args.map(a=>typeof a==='function'?'callback':a);const values=JSON.parse(el.textContent);values.push(safe);el.textContent=JSON.stringify(values);fetch('/_tz11/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(safe)});if(args[1]==='getClientID')args[2]('123456789');};queued.forEach(args=>window.ym(...args));`;
http.createServer(async(req,res)=>{
 try {
  const path=req.url.split('?')[0];
  if(path==='/_tz11/metrika.js'){res.setHeader('Content-Type','text/javascript');res.end(fixtureScript);return;}
  if(path==='/_tz11/collect'){let data='';for await(const chunk of req)data+=chunk;events.push(JSON.parse(data));writeFileSync(new URL('./counter-events.json',import.meta.url),JSON.stringify(events,null,2));res.end('ok');return;}
  if(path.startsWith('/_tz11/visitor/')){
   const mode=path.split('/').pop(); const target=new URL(req.url,origin).searchParams.get('target')||'/skaner-qr-koda?ref=tz11-demo';
   const values={fresh:null,old:JSON.stringify({choice:'declined',version:'2026-09-20.1',at:1}),legacy:'legacy',expired:JSON.stringify({choice:'declined',version:'2026-10-08.1',at:1})};
   if(!Object.hasOwn(values,mode)||!target.startsWith('/')||target.startsWith('//')){res.writeHead(400);res.end();return;}
   res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');
   res.end(`<title>TZ11 local visitor fixture</title><p>Local synthetic visitor: ${mode}</p><script>localStorage.removeItem('qrs_cookie_choice');localStorage.removeItem('qrs_cookie_notice');localStorage.removeItem('cookie_consent');document.cookie='qrs_analytics_disabled=;Max-Age=0;Path=/';${values[mode]==='legacy'?"localStorage.setItem('cookie_consent','declined');":values[mode]?`localStorage.setItem('qrs_cookie_choice',${JSON.stringify(values[mode])});`:''}location.replace(${JSON.stringify(target)});</script>`);return;
  }
  log.push({at:new Date().toISOString(),method:req.method,path});writeFileSync(new URL('./network.json',import.meta.url),JSON.stringify(log,null,2));
  const headers={...req.headers,host:'127.0.0.1:3010','accept-encoding':'identity'};delete headers.connection;
  let body; if(!['GET','HEAD'].includes(req.method)){const chunks=[];for await(const chunk of req)chunks.push(chunk);body=Buffer.concat(chunks);}
  const response=await fetch(upstream+req.url,{method:req.method,headers,body,redirect:'manual'});
  res.statusCode=response.status;
  for(const [k,v]of response.headers)if(!['content-length','content-encoding','transfer-encoding','connection','set-cookie'].includes(k))res.setHeader(k,k==='location'?v.replace(upstream,origin):v);
  if(response.headers.getSetCookie().length)res.setHeader('set-cookie',response.headers.getSetCookie());
  res.setHeader('Cache-Control','no-store');
  let bytes=Buffer.from(await response.arrayBuffer());
  if(/javascript|text\/html|text\/x-component/.test(response.headers.get('content-type')||'')){
   let text=bytes.toString().replaceAll('https://mc.yandex.ru/metrika/tag.js','/_tz11/metrika.js');
   // Inject a synthetic counter only in this test proxy, without touching settings.
   text=text.replaceAll('yandexMetrikaId\\":\\"$undefined','yandexMetrikaId\\":\\"999999999').replaceAll('yandexMetrikaId":"$undefined','yandexMetrikaId":"999999999');
   bytes=Buffer.from(text);
  }
  res.end(bytes);
 }catch{res.writeHead(502);res.end('Local test proxy error');}
}).listen(3013,'127.0.0.1',()=>console.log('TZ11 synthetic analytics preview: '+origin));
