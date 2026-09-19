import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignJWT } from 'jose';
import { verifySessionJwt } from './session-jwt.ts';
const secret='new-test-secret-at-least-thirty-two-characters';
const previousSecret='old-test-secret-31-characters!!!';
const rotatedAt='2026-09-19T12:00:00Z';
const start=Date.parse(rotatedAt)/1000;
async function token(key:string,iat:number,exp:number) {
  return new SignJWT({email:'fixture@example.invalid'}).setProtectedHeader({alg:'HS256'}).setSubject('fixture').setIssuedAt(iat).setExpirationTime(exp).sign(new TextEncoder().encode(key));
}
test('rotation accepts an unexpired legacy session only during its original lifetime',async()=>{
  const legacy=await token(previousSecret,start-86400,start+6*86400);
  assert.equal((await verifySessionJwt(legacy,{secret,previousSecret,rotatedAt,now:new Date(start*1000+1000)})).payload.sub,'fixture');
  await assert.rejects(verifySessionJwt(legacy,{secret,previousSecret,rotatedAt,now:new Date((start+7*86400)*1000)}));
  await assert.rejects(verifySessionJwt(legacy,{secret,now:new Date(start*1000)}));
});
test('old key cannot mint post-rotation or extended sessions; new key works',async()=>{
  await assert.rejects(verifySessionJwt(await token(previousSecret,start+1,start+600),{secret,previousSecret,rotatedAt,now:new Date((start+2)*1000)}));
  await assert.rejects(verifySessionJwt(await token(previousSecret,start-1,start+30*86400),{secret,previousSecret,rotatedAt,now:new Date(start*1000)}));
  assert.equal((await verifySessionJwt(await token(secret,start,start+30*86400),{secret,now:new Date((start+8*86400)*1000)})).payload.sub,'fixture');
});
