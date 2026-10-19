import assert from "node:assert/strict";
import {test} from "node:test";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import {qrA6Svg} from "@/lib/qr-a6";
test("A6 print has physical page dimensions and a decodable 60 mm code",async()=>{
 const url="https://example.com/reviews";
 const source=await QRCode.toString(url,{type:"svg",width:1200,margin:4});
 const svg=qrA6Svg(source);
 assert.match(svg,/width="105mm" height="148mm"/);
 assert.match(svg,/x="22.5" y="42" width="60" height="60"/);
 const {data,info}=await sharp(Buffer.from(svg),{density:200}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
 assert.equal(decoded?.data,url);
});
