import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import jsQR from "jsqr";
import { renderStyledQrSvg, renderStyledQrPng, renderStyledQrJpg, renderStyledQrPdf, renderStyledQrEps } from "@/lib/qr-styled-render";
import { QR_FRAMES } from "@/lib/qr-frame";
import { evaluateScannability } from "@/lib/scannability";

test("every frame retains decodable QR and Cyrillic outlines in all exports", async () => {
  const data = "https://example.com/print-test";
  for (const {id} of QR_FRAMES) {
    const style = {frameStyle:id,frameText:"Оставь отзыв",margin:40};
    const svg = await renderStyledQrSvg(data,style,600);
    if (id !== "none") { assert.doesNotMatch(svg, /<text\b/); assert.match(svg,/scale\([^)]*-/); }
    for (const bytes of [await renderStyledQrPng(data,style,600),await renderStyledQrJpg(data,style,600),await sharp(Buffer.from(svg)).png().toBuffer()]) {
      const {data:raw,info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      assert.equal(jsQR(new Uint8ClampedArray(raw),info.width,info.height)?.data,data,id);
    }
    assert.equal((await renderStyledQrPdf(data,style,600)).subarray(0,4).toString(),"%PDF");
    const eps=(await renderStyledQrEps(data,style,600)).toString();
    assert.match(eps,/%!PS-Adobe/);
    assert.match(eps,/ASCIIHexDecode/);
    assert.match(eps,/DeviceRGB setcolorspace/);
  }
});
test("caption contrast is included in final image quality",()=>{
  assert.equal(evaluateScannability({frameStyle:"bottom",frameTextColor:"#ffffff"}).safeToUse,false);
});

test("filled frames choose readable captions and reject a matching caption color",()=>{
  for(const ink of ["#111111","#ffffff","#214ad9","#ffd200"]){
    assert.equal(evaluateScannability({frameStyle:"tag",frameColor:ink,margin:4}).safeToUse,true,ink);
  }
  assert.equal(evaluateScannability({frameStyle:"tag",frameColor:"#111111",frameTextColor:"#111111",margin:4}).safeToUse,false);
  assert.equal(evaluateScannability({frameStyle:"tag",frameColor:"#ffffff",frameTextColor:"#ffffff",margin:4}).safeToUse,false);
});

import { buildQrStylingOptions } from "@/lib/qr-styling-options";
import { defaultQrStyle } from "@/lib/qr-style-config";
test("new templates enforce a four-module quiet zone even for small legacy pixel margins",()=>{
  const data="https://example.com/print-test";
  const safe=buildQrStylingOptions(data,{...defaultQrStyle,quietZoneModules:4},600).margin;
  assert.equal(buildQrStylingOptions(data,{...defaultQrStyle,frameStyle:"hand",margin:2},600).margin,safe);
  assert.equal(buildQrStylingOptions(data,{...defaultQrStyle,frameStyle:"bottom",margin:2},600).margin,2);
});
