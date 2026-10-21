import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScanResult } from "./qr-scan-result.ts";
import { decodeQrPixels } from "./qr-scan-decode.ts";
import QRCode from "qrcode";
import sharp from "sharp";

test("scanner parses short QR-S links without resolving or following them", () => {
  const value = "https://qr-s.ru/r/printed-code";
  const result = parseScanResult(value);
  assert.equal(result.type, "URL");
  assert.equal(result.url, value);
  assert.equal(result.domain, "qr-s.ru");
  assert.equal(result.raw, value);
});

test("executable schemes, markup, control-character URLs and malformed links stay inert", () => {
  for (const raw of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd", "https://exa\nmple.com", "https://", '<img src="https://example.com/track">', "tel:+79999999999", "Привет, мир!"]) {
    const result = parseScanResult(raw);
    assert.equal(result.type, "TEXT", raw);
    assert.equal(result.url, undefined, raw);
    assert.equal(result.raw, raw);
  }
});

test("suspicious URLs preserve the real hostname and block embedded credentials", () => {
  const credentials = parseScanResult("https://trusted.ru:password@untrusted.example/path");
  assert.equal(credentials.domain, "untrusted.example");
  assert.equal(credentials.url, undefined);
  assert.equal(credentials.warnings.length, 1);
  assert.equal(parseScanResult("http://127.0.0.1/path").warnings.length, 2);
  assert.ok(parseScanResult("https://пример.рф").domain?.startsWith("xn--"));
  assert.equal(parseScanResult("https://пример.рф").warnings.length, 1);
});

test("Wi-Fi escaped separators and passwords remain intact", () => {
  const result = parseScanResult('WIFI:T:WPA;S:Coffee\\; bar\\: guest;P:pa\\;ss\\:word\\\\end;H:true;;');
  assert.equal(result.type, "WIFI");
  assert.deepEqual(result.wifi, { ssid: "Coffee; bar: guest", encryption: "WPA", password: "pa;ss:word\\end", hidden: true });
  assert.deepEqual(parseScanResult("WIFI:S:Public;T:nopass;;").wifi, { ssid: "Public", encryption: "nopass", password: "", hidden: false });
  assert.equal(parseScanResult("WIFI:T:WPA;;").type, "TEXT");
});

test("vCard handles folded names, grouped fields, multiple contacts and escaped text", () => {
  const raw = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Иван\r\n  Иванов\r\nTEL;TYPE=CELL:+79991234567\r\nitem1.TEL:tel:+74951234567\r\nEMAIL;TYPE=WORK:ivan@example.test\r\nEND:VCARD";
  assert.deepEqual(parseScanResult(raw).contact, { name: "Иван Иванов", phones: ["+79991234567", "+74951234567"], emails: ["ivan@example.test"] });
  assert.equal(parseScanResult("BEGIN:VCARD\nN:Иванов;Иван;;;\nEND:VCARD").contact?.name, "Иванов Иван");
});

test("bundled QR decoder reads URL, Cyrillic text, Wi-Fi and vCard, including degraded images", async () => {
  const payloads = ["https://qr-s.ru/r/printed-code", "Тестовый текст без перехода", "WIFI:T:WPA;S:Preview;P:example-pass;;", "BEGIN:VCARD\nVERSION:3.0\nFN:Тестовый контакт\nTEL:+79990000000\nEMAIL:test@example.test\nEND:VCARD"];
  for (const payload of payloads) {
    const png = await QRCode.toBuffer(payload, { width: 500, margin: 4, errorCorrectionLevel: "H" });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(await decodeQrPixels(new Uint8ClampedArray(data), info.width, info.height), payload);
  }
  const payload = payloads[0];
  const png = await QRCode.toBuffer(payload, { width: 600, margin: 5, errorCorrectionLevel: "H" });
  const variants = [
    sharp(png).rotate(17, { background: "white" }),
    sharp(png).blur(0.6),
    sharp(png).resize(190,190).extend({ top:150,bottom:150,left:250,right:250,background:"white" }),
    sharp(png).negate({ alpha:false }),
    sharp(png).affine([[1,0.18],[0,1]], { background:"white" }),
  ];
  for (const [index,image] of variants.entries()) {
    const { data,info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject:true });
    assert.equal(await decodeQrPixels(new Uint8ClampedArray(data),info.width,info.height),payload,`variant ${index}`);
  }
  const blank = new Uint8ClampedArray(100*100*4).fill(255);
  assert.equal(await decodeQrPixels(blank,100,100),null);
});
