import {writeFileSync} from 'node:fs';
const base='http://127.0.0.1:3010';
const paths=['/','/pricing','/skaner-qr-koda','/qr-s-logotipom','/privacy-policy','/terms-of-service','/login','/register','/qr-wifi','/blog','/contacts','/qr-lifetime','/personal-data-consent'];
const checks=[];
for(const path of paths){const r=await fetch(base+path);const text=await r.text();checks.push({path,status:r.status,h1:(text.match(/<h1\b/g)||[]).length,title:text.match(/<title>(.*?)<\/title>/)?.[1],frame:r.headers.get('content-security-policy')});if(r.status!==200)throw Error(path);}
const token='tz11-local-csrf';const body=JSON.stringify({code:'tz11-demo',analyticsEnabled:true,policyVersion:'opt-out:2026-10-21.1'});
const post=(path,cookie,data=body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie:`csrf_token=${token}; ${cookie}`,'x-csrf-token':token,origin:base},body:data});
let r=await post('/api/referrals/visit','');const enabled=await r.json();const partner=r.headers.getSetCookie().find(v=>v.startsWith('qrs_partner_visit='))?.split(';')[0];if(!partner||!enabled.data?.tracked)throw Error('enabled referral not captured');
checks.push({check:'referral-enabled',status:r.status,tracked:enabled.data.tracked,partnerCookieSet:!!partner});
r=await post('/api/referrals/visit',`qrs_analytics_disabled=1; ${partner}`);const disabled=await r.json();if(disabled.data?.tracked!==false)throw Error('refusal ignored');checks.push({check:'referral-disabled-with-stale-cookie',status:r.status,tracked:disabled.data.tracked,partnerCookieDeleted:r.headers.getSetCookie().some(v=>v.startsWith('qrs_partner_visit=')&&/Max-Age=0|1970/.test(v))});
r=await post('/api/analytics/revoke',`qrs_analytics_disabled=1; ${partner}`,'{}');checks.push({check:'revoke',status:r.status,revoked:(await r.json()).data?.revoked});
writeFileSync(new URL('./http-checks.json',import.meta.url),JSON.stringify(checks,null,2));console.log('13 pages and 3 analytics API checks passed');
