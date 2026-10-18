/** Read-only, non-PII fingerprints. Store output outside Git with mode 0600. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDb } from "../src/lib/db.ts";
const db=getDb(),hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const models=["user","workspace","subscription","payment","uploadedFile","legalAcceptance"] as const;
const snapshot:{tables:Record<string,Record<string,string>>;http:{path:string;status:number;location:string}[]}={tables:{},http:[]};
try{
  for(const model of models){
    const table=db[model] as unknown as {findMany:(args:object)=>Promise<Record<string,unknown>[]>};
    const rows=await table.findMany({orderBy:{id:"asc"}});
    snapshot.tables[model]=Object.fromEntries(rows.map(row=>{
      // Conversion delivery may advance; commercial and customer data must stay identical.
      const stable=Object.fromEntries(Object.entries(row).filter(([key])=>!key.startsWith("metrika") && !["lastLoginAt","lastSeenAt","updatedAt"].includes(key)));
      return [String(row.id),hash(stable)];
    }));
  }
  const origin=(process.env.APP_URL??"https://qr-s.ru").replace(/\/+$/,"");
  if(process.argv[2]==="--compare"){
    const before=JSON.parse(await readFile(process.argv[3],"utf8")) as typeof snapshot;
    const failures:string[]=[];
    for(const [model,rows]of Object.entries(before.tables))for(const[id,sha]of Object.entries(rows))if(snapshot.tables[model]?.[id]!==sha)failures.push(`${model}:${id}`);
    for(const old of before.http){const r=await fetch(origin+old.path,{redirect:"manual",headers:{"User-Agent":"QR-S-release-check-bot"},signal:AbortSignal.timeout(15_000)});if(r.status!==old.status||hash(r.headers.get("location"))!==old.location)failures.push(`http:${old.path}`);await r.body?.cancel();}
    console.log(JSON.stringify({ok:!failures.length,counts:Object.fromEntries(Object.entries(snapshot.tables).map(([k,v])=>[k,Object.keys(v).length])),links:before.http.length,failures},null,2));
    if(failures.length)process.exitCode=1;
  }else{
    const qr=await db.qrCode.findMany({where:{shortCode:{not:null},isArchived:false},orderBy:{createdAt:"asc"},take:10,select:{shortCode:true,contentType:true}});
    for(const q of qr){const path=`/${q.contentType==="VCARD"?"v":["URL","APP_STORE","INSTAGRAM","FACEBOOK","WHATSAPP"].includes(q.contentType)?"r":"p"}/${q.shortCode}`;const r=await fetch(origin+path,{redirect:"manual",headers:{"User-Agent":"QR-S-release-check-bot"},signal:AbortSignal.timeout(15_000)});snapshot.http.push({path,status:r.status,location:hash(r.headers.get("location"))});await r.body?.cancel();}
    console.log(JSON.stringify(snapshot));
  }
}finally{await db.$disconnect();}
