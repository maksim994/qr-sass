import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';
const expected='https://example.com/logo-preview';
const rows=[];
for(const format of ['png','svg']) {
  const bytes=await fs.readFile(new URL(`./downloaded-logo.${format}`,import.meta.url));
  if(format==='svg') {
    const svg=bytes.toString();
    assert.match(svg,/<image\b/);
    assert.match(svg,/data:image\/png;base64,/);
    assert.equal(/(?:href|xlink:href)="(?:https?:|blob:)/.test(svg),false);
  }
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height,{inversionAttempts:'attemptBoth'});
  assert.equal(decoded?.data,expected);
  let blue=0;for(let i=0;i<data.length;i+=4)if(data[i]<60&&data[i+1]<120&&data[i+2]>150)blue++;
  assert.ok(blue>1000);
  rows.push({format,width:info.width,height:info.height,payload:decoded.data,logoPixels:blue,passed:true});
}
await fs.writeFile(new URL('./download-checks.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows));
