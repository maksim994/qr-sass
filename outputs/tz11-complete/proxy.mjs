import http from 'node:http';
import ts from 'typescript';
import path from 'node:path';
import { readFileSync, appendFileSync } from 'node:fs';
const upstream='http://127.0.0.1:3016', log=new URL('./browser-network.ndjson',import.meta.url);
http.createServer(async(req,res)=>{
  if(req.url==='/__tz11-network'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(readFileSync(new URL('./network-evidence.html',import.meta.url)));return;}
  if(req.url==='/__tz11-goals'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(readFileSync(new URL('./goals.html',import.meta.url)));return;}
  if(req.url.startsWith('/__tz11-module/')) { const relative=req.url.slice('/__tz11-module/'.length); if(!/^lib\/[a-z0-9-]+\.ts$/.test(relative)){res.writeHead(404).end();return;} const source=readFileSync(path.resolve('src',relative),'utf8').replace(/from \"@\//g,'from \"/__tz11-module/').replace(/(from \"\/__tz11-module\/[^\"]+)(\")/g,'$1.ts$2');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;res.writeHead(200,{'content-type':'text/javascript'}).end(code);return;}
  if(req.url==='/__tz11-log') { let body='';for await(const c of req)body+=c;try{appendFileSync(log,JSON.stringify(JSON.parse(body))+'\n');}catch{}res.writeHead(204).end();return; }
  if(req.url==='/__tz11-observe.js'){res.writeHead(200,{'content-type':'text/javascript'}).end(readFileSync(new URL('./observe.js',import.meta.url)));return;}
  const headers=new Headers(Object.fromEntries(Object.entries(req.headers).filter(([k,v])=>!['host','connection','accept-encoding','content-length'].includes(k)&&typeof v==='string')));
  headers.set('host','127.0.0.1:3016'); if(headers.get('origin')==='http://127.0.0.1:3017')headers.set('origin',upstream);
  if(req.url.startsWith('/admin')) {try {const fixture=JSON.parse(readFileSync('/Users/mvmolkov/.codex/tmp/qr-tz11-20261021/browser-fixture.json','utf8'));headers.set('cookie',(headers.get('cookie')??'')+'; '+fixture.adminCookie);}catch{}}
  const chunks=[];for await(const c of req)chunks.push(c);
  try {const r=await fetch(upstream+req.url,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined,redirect:'manual'});const out={};r.headers.forEach((v,k)=>{if(!['content-encoding','transfer-encoding','content-length','set-cookie'].includes(k))out[k]=v;});out['set-cookie']=r.headers.getSetCookie();
    let body=Buffer.from(await r.arrayBuffer());if((out['content-type']??'').includes('text/html'))body=Buffer.from(body.toString().replace('<head>','<head><script src="/__tz11-observe.js"></script>'));
    res.writeHead(r.status,out).end(body);
  } catch {res.writeHead(502).end('Local upstream unavailable');}
}).listen(3017,'127.0.0.1',()=>console.log('Local QA proxy 3017; real SDKs are forwarded unmodified'));
