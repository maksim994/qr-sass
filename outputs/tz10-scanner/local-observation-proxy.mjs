// Local acceptance only. Records metadata, never request bodies or credentials.
import http from 'node:http';
import fs from 'node:fs';
const log = new URL('./network.jsonl',import.meta.url);
fs.writeFileSync(log,'');
http.createServer((request,response)=>{
  let bytes=0;
  request.on('data',chunk=>{bytes+=chunk.length;});
  request.on('end',()=>fs.appendFileSync(log,JSON.stringify({at:new Date().toISOString(),method:request.method,path:request.url,bytes,contentType:request.headers['content-type']??null})+'\n'));
  const upstream=http.request({hostname:'127.0.0.1',port:3010,path:request.url,method:request.method,headers:{...request.headers,host:'127.0.0.1:3010'}},incoming=>{
    response.writeHead(incoming.statusCode??502,incoming.headers);incoming.pipe(response);
  });
  upstream.on('error',()=>{response.writeHead(502);response.end('Local preview unavailable');});
  request.pipe(upstream);
}).listen(3012,'127.0.0.1',()=>process.stdout.write('Local observation proxy: http://127.0.0.1:3012\n'));
