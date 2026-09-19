import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import QRCodeStyling from "qr-code-styling";
import sharp from "sharp";
import { logoPlacement, renderStyledQrPng, renderStyledQrSvg, svgImageGeometry } from "./qr-styled-render.ts";
import { pinnedLookup, resolvePublicHttpUrl } from "./safe-egress.ts";
import { buildQrStylingOptions } from "./qr-styling-options.ts";
import { parseStyleConfig } from "./qr-style-config.ts";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";

function imageTag(svg: string) {
  const geom = svgImageGeometry(svg);
  assert.ok(geom, "expected <image> in SVG");
  return geom;
}

async function previewSvg(
  content: string,
  styleRaw: Record<string, unknown>,
  size: number,
  imageWidth: number,
  imageHeight: number,
) {
  const style = parseStyleConfig(styleRaw);
  const opts = buildQrStylingOptions(content, style, size);
  const qr = new QRCodeStyling({ jsdom: JSDOM, type: "svg" });
  (
    qr as unknown as {
      _window: {
        Image: new () => { width: number; height: number; onload?: () => void; src: string };
      };
    }
  )._window.Image = class {
    width = imageWidth;
    height = imageHeight;
    onload: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  };
  qr.update(opts);
  return String(await qr.getRawData("svg"));
}

test("logoMargin shrinks the drawn logo inside the reserved module box", () => {
  const none = logoPlacement(280, 0.2, 0);
  const padded = logoPlacement(280, 0.2, 20);
  assert.equal(none.box, padded.box);
  assert.ok(padded.inner < none.inner);
  assert.equal(none.inner, none.box);
  assert.equal(padded.inner, padded.box - 40);
  assert.equal(none.inner, 63);
  assert.equal(none.x, 108);
});

test("server SVG logo geometry matches qr-code-styling preview", async () => {
  const square = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const rect = await sharp({ create: { width: 16, height: 8, channels: 4, background: "#00ff00" } }).png().toBuffer();
  const cases = [
    { content: "https://example.org", size: 280, logoScale: 0.2, logoMargin: 0, errorCorrectionLevel: "H", png: square, w: 8, h: 8 },
    { content: "https://example.org", size: 280, logoScale: 0.2, logoMargin: 20, errorCorrectionLevel: "H", png: square, w: 8, h: 8 },
    { content: "https://example.org", size: 512, logoScale: 0.2, logoMargin: 0, errorCorrectionLevel: "Q", png: square, w: 8, h: 8 },
    { content: "https://qr-s.ru/p/demo", size: 280, logoScale: 0.2, logoMargin: 0, errorCorrectionLevel: "H", png: rect, w: 16, h: 8, bgTransparent: true },
  ] as const;

  for (const item of cases) {
    const style = {
      logoUrl: `data:image/png;base64,${item.png.toString("base64")}`,
      logoScale: item.logoScale,
      logoMargin: item.logoMargin,
      errorCorrectionLevel: item.errorCorrectionLevel,
      bgTransparent: "bgTransparent" in item ? item.bgTransparent : false,
    };
    const server = imageTag(await renderStyledQrSvg(item.content, style, item.size));
    const preview = imageTag(await previewSvg(item.content, style, item.size, item.w, item.h));
    assert.deepEqual(server, preview, JSON.stringify(item));
  }
});

test("server PNG export changes when logoMargin changes", async () => {
  const logo = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const base = { logoUrl: `data:image/png;base64,${logo.toString("base64")}`, logoScale: 0.2, errorCorrectionLevel: "H" };
  const p0 = await renderStyledQrPng("https://example.org", { ...base, logoMargin: 0 }, 280);
  const p20 = await renderStyledQrPng("https://example.org", { ...base, logoMargin: 20 }, 280);
  assert.equal(p0.equals(p20), false);
  const svg = await renderStyledQrSvg("https://example.org", { ...base, logoMargin: 0 }, 280);
  assert.match(svg, /<path |<rect /i);
  assert.match(svg, /<image\b/i);
});

test("DNS rebinding does not send logo HTTP to loopback after a public lookup", async () => {
  const originalPromiseLookup = dnsPromises.lookup;
  const originalLookup = dns.lookup;
  const hostname = "synthetic-rebinding.invalid";
  let laterLookups = 0;
  dnsPromises.lookup = (async (host, options) =>
    host === hostname
      ? [{ address: "192.0.2.1", family: 4 }]
      : originalPromiseLookup(host, options)) as typeof dnsPromises.lookup;
  dns.lookup = ((host, options, callback) => {
    laterLookups += 1;
    return originalLookup(host, options, callback);
  }) as typeof dns.lookup;
  try {
    const { pins } = await resolvePublicHttpUrl(`http://${hostname}/synthetic.png`);
    assert.deepEqual(pins, [{ address: "192.0.2.1", family: 4 }]);
    await new Promise<void>((resolve, reject) => {
      pinnedLookup(pins)(hostname, {}, ((error, address) => {
        try {
          assert.equal(error, null);
          assert.equal(address, "192.0.2.1");
          assert.equal(laterLookups, 0);
          resolve();
        } catch (caught) {
          reject(caught);
        }
      }) as Parameters<typeof dns.lookup>[2]);
    });
  } finally {
    dnsPromises.lookup = originalPromiseLookup;
    dns.lookup = originalLookup;
  }
});
