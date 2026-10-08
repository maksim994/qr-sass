import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareStaticQr, STATIC_QR_TYPES } from "./static-qr.ts";
import { canonicalQrData } from "./qr-canonical.ts";
import { parseStaticQrDraft } from "./static-qr-draft.ts";
import { defaultQrStyle, parseStyleConfig } from "./qr-style-config.ts";
import { buildQrStylingOptions } from "./qr-styling-options.ts";

function encoded(type: string, payload: Record<string, unknown>) {
  const qr = prepareStaticQr(type, payload); assert.ok(qr.ok, `${type} should encode`); return qr;
}
test("all public static formats encode useful independent content", () => {
  const examples = { URL: { url: "example.com" }, TEXT: { text: "Привет" }, WIFI: { ssid: "Cafe", encryption: "WPA", password: "secret" }, VCARD: { firstName: "Иван" }, EMAIL: { email: "hello@example.com", subject: "Здравствуйте" }, PHONE: { phone: "+79991234567" }, SMS: { phone: "+79991234567", message: "Да" }, LOCATION: { latitude: "55.75", longitude: "37.6" } };
  for (const type of STATIC_QR_TYPES) { const qr = encoded(type, examples[type]); assert.equal(qr.payload.staticDirect, true); assert.ok(qr.data); assert.doesNotMatch(qr.data, /qr-s.ru\/[rpv]\//); }
  assert.equal(encoded("URL", examples.URL).data, "https://example.com");
});
test("Wi-Fi preserves spaces and escapes separators instead of changing credentials", () => {
  assert.equal(encoded("WIFI", { ssid: " Cafe; ", password: " p:a\\s,s; ", encryption: "WPA" }).data, "WIFI:T:WPA;S: Cafe\\; ;P: p\\:a\\\\s\\,s\\; ;;");
  assert.equal(prepareStaticQr("WIFI", { ssid: "Cafe", password: "a\nb" }).ok, false);
  assert.equal(encoded("WIFI", { ssid: "Cafe", password: "secret", encryption: "nopass" }).payload.password, "");
});
test("vCard escapes line/property injection and direct variant does not convert old /v codes", () => {
  const qr = encoded("VCARD", { firstName: "Иван\nURL:https://evil.example", lastName: "Иванов;старший", organization: "A,B" });
  assert.match(qr.data, /Иван\\nURL:https:\/\/evil.example/); assert.match(qr.data, /Иванов\\;старший/); assert.match(qr.data, /ORG:A\\,B/);
  const base = { kind: "STATIC" as const, contentType: "VCARD" as const, appUrl: "https://qr-s.ru", shortCode: "legacy", payload: { firstName: "Иван" } };
  assert.deepEqual(canonicalQrData(base), { data: "https://qr-s.ru/v/legacy", ready: true, isDynamic: true });
  const direct = canonicalQrData({ ...base, payload: qr.payload, shortCode: null });
  assert.equal(direct.data, qr.data); assert.equal(direct.isDynamic, false);
});
test("invalid, private, unsupported and oversized inputs do not produce a misleading code", () => {
  for (const url of ["", "javascript:alert(1)", "http://127.0.0.1", "http://localhost", "https://10.0.0.1"]) assert.equal(prepareStaticQr("URL", { url }).ok, false);
  for (const payload of [{ latitude: "91", longitude: "0" }, { latitude: "", longitude: "2" }, { latitude: "NaN", longitude: "3" }]) assert.equal(prepareStaticQr("LOCATION", payload).ok, false);
  assert.equal(prepareStaticQr("PDF", { url: "https://example.com" }).ok, false);
  assert.equal(prepareStaticQr("TEXT", { text: "я".repeat(1001) }).ok, false);
  assert.equal(prepareStaticQr("EMAIL", { email: "a@example.com?bcc=secret" }).ok, false);
});
test("archive drafts whitelist payloads, expire and cannot import remote logos", () => {
  const raw = { v: 1, createdAt: 1000, contentType: "WIFI", payload: { ssid: "Cafe", password: " secret ", gdprRequired: true, trackingPixels: { metaPixelId: "x" } }, style: defaultQrStyle };
  const parsed = parseStaticQrDraft(JSON.stringify(raw), 2000); assert.ok(parsed);
  assert.equal(parsed.payload.password, " secret "); assert.equal(parsed.payload.gdprRequired, undefined); assert.equal(parsed.payload.trackingPixels, undefined);
  assert.equal(parseStaticQrDraft(JSON.stringify(raw), 3601001), null);
  assert.equal(parseStaticQrDraft(JSON.stringify(raw), 999), null);
  assert.equal(parseStaticQrDraft(JSON.stringify({ ...raw, style: { ...defaultQrStyle, logoUrl: "https://example.com/logo.png" } }), 2000), null);
  assert.equal(parseStaticQrDraft("{broken", 2000), null);
});
test("four-module quiet zone scales with new archives; legacy pixel margins stay unchanged", () => {
  const direct = parseStyleConfig({ ...defaultQrStyle, quietZoneModules: 4 });
  const large = buildQrStylingOptions("https://example.com", direct, 1200);
  const small = buildQrStylingOptions("https://example.com", direct, 280);
  assert.ok(large.margin > small.margin); assert.ok(large.margin >= 100);
  assert.equal(buildQrStylingOptions("https://example.com", parseStyleConfig({ margin: 2 }), 1200).margin, 2);
});
