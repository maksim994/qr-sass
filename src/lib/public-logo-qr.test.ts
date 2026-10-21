import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { publicLogoQrStyle } from "./public-logo-qr.ts";
import { buildQrStylingOptions } from "./qr-styling-options.ts";
import { renderStyledQrPng, renderStyledQrSvg } from "./qr-styled-render.ts";
import { decodeQrPixels } from "./qr-scan-decode.ts";
import { defaultQrStyle } from "./qr-style-config.ts";

test("public logo codes use H and a four-module quiet zone without changing existing defaults", () => {
  const style = publicLogoQrStyle("data:image/png;base64,example");
  const options = buildQrStylingOptions("https://example.com",style,1200);
  assert.equal(options.qrOptions.errorCorrectionLevel,"H");
  assert.equal(options.imageOptions?.hideBackgroundDots,true);
  assert.ok(options.margin>4);
  assert.equal(defaultQrStyle.errorCorrectionLevel,"M");
  assert.equal(defaultQrStyle.logoUrl,"");
});

test("logo PNG/SVG exports contain the logo and decode to the original short, long and Cyrillic URL", async () => {
  const logo = await sharp({create:{width:180,height:180,channels:4,background:"#1E4FD1"}}).png().toBuffer();
  const style = publicLogoQrStyle(`data:image/png;base64,${logo.toString("base64")}`);
  for(const content of ["https://example.com/logo-check", "https://example.com/catalog?utm_source=qr&utm_medium=print&utm_campaign=logo-preview&item=1234567890", "https://example.com/каталог?тема=новинки"]) {
    const png = await renderStyledQrPng(content,style,1200);
    const svg = await renderStyledQrSvg(content,style,1200);
    assert.match(svg,/<image\b/);
    assert.match(svg,/data:image\/png;base64,/);
    const {data,info} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(await decodeQrPixels(new Uint8ClampedArray(data),info.width,info.height),content);
    let blue=0;
    for(let i=0;i<data.length;i+=4)if(data[i]<50&&data[i+1]<110&&data[i+2]>180)blue++;
    assert.ok(blue>1000,"the exported bitmap contains visible blue logo pixels");
    const raster = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(await decodeQrPixels(new Uint8ClampedArray(raster.data),raster.info.width,raster.info.height),content);
  }
});
