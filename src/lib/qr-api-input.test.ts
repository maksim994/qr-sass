import assert from "node:assert/strict";
import { test } from "node:test";
import { generateQrApiKey, hashQrApiKey, readQrBearer, qrApiKeySchema, qrApiCreateSchema, qrApiImageSchema, qrApiStatsSchema } from "@/lib/qr-api-input";
import { publicOpenApi } from "@/lib/public-openapi";
import articles from "./blog-openapi.json" with { type: "json" };
import { isSiteAnalyticsSurface } from "@/lib/analytics-policy";
import { JSDOM } from "jsdom";
import { captureFirstTouch, readFirstTouch } from "@/lib/signup-source";

test("QR keys have 256 bits, separate credentials, and only explicit Bearer authentication", () => {
  const a = generateQrApiKey(), b = generateQrApiKey();
  assert.match(a.key, /^qrs_api_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a.key, b.key);
  assert.equal(a.keyHash, hashQrApiKey(a.key));
  assert.ok(!a.keyHash.includes(a.key));
  assert.equal(readQrBearer(new Request("https://example.com", { headers: { authorization: `Bearer ${a.key}` } })), a.key);
  for (const headers of [{cookie: `key=${a.key}`}, {authorization: 'Bearer qre_fake'}, {authorization: 'Bearer qrs_blog_fake'}, {authorization: `Basic ${a.key}`}]) {
    assert.equal(readQrBearer(new Request(`https://example.com?key=${a.key}`, {headers})), null);
  }
});
test("key scopes are explicit and bounded; target URL and source cannot smuggle tenant/access fields", () => {
  for (const scopes of [[], ['qr:delete'], ['qr:read','qr:read']]) assert.equal(qrApiKeySchema.safeParse({name:'Bitrix',scopes}).success, false);
  assert.equal(qrApiKeySchema.safeParse({name:123, scopes:['qr:read']}).success, false);
  const create = {name:'Товар',targetUrl:'https://example.com/product',source:'bitrix_module'};
  assert.ok(qrApiCreateSchema.safeParse(create).success);
  for (const extra of [{workspaceId:'foreign'}, {password:'secret'}, {kind:'STATIC'}, {source:'arbitrary'}]) assert.equal(qrApiCreateSchema.safeParse({...create,...extra}).success, false);
  for (const targetUrl of ['javascript:alert(1)','file:///tmp/file','https://user:pass@example.com','ftp://example.com']) assert.equal(qrApiCreateSchema.safeParse({...create,targetUrl}).success,false);
});
test("image work is bounded and statistics reject impossible/reversed/overlong periods", () => {
  assert.equal(qrApiImageSchema.parse({}).errorCorrectionLevel,'H');
  for (const params of [{size:1},{size:2049},{foreground:'url(private)'},{format:'pdf'},{logoUrl:'http://localhost'}]) assert.equal(qrApiImageSchema.safeParse(params).success,false);
  for (const params of [{from:'2026-02-29',to:'2026-03-01'},{from:'2026-10-23',to:'2026-10-22'},{from:'2025-01-01',to:'2026-01-02'}]) assert.equal(qrApiStatsSchema.safeParse(params).success,false);
  assert.ok(qrApiStatsSchema.safeParse({from:'2026-10-22',to:'2026-10-22'}).success);
});
test("combined OpenAPI preserves every published editorial operation and its schemas", () => {
  for (const [path, methods] of Object.entries(articles.paths)) assert.deepEqual(publicOpenApi.paths[path as keyof typeof publicOpenApi.paths],methods);
  for (const [name, schema] of Object.entries(articles.components.schemas)) assert.deepEqual(publicOpenApi.components.schemas[name as keyof typeof publicOpenApi.components.schemas],schema);
  assert.ok(publicOpenApi.paths['/api/v1/qr']);
  assert.deepEqual(publicOpenApi.paths['/api/v1/qr'].post.security,[{QrApiKey:[]}]);
});
test("Bitrix marketplace first touch survives navigation to registration", () => {
  const dom = new JSDOM('',{url:'https://qr-s.ru/?utm_source=bitrix_marketplace&utm_medium=module_settings'});
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
  Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
  try {
    captureFirstTouch();
    dom.window.history.pushState({},'', '/register?utm_source=other');
    assert.equal(readFirstTouch()?.utmSource,'bitrix_marketplace');
    assert.equal(captureFirstTouch()?.utmMedium,'module_settings');
  } finally {
    dom.window.close();
    if (oldWindow) Object.defineProperty(globalThis,'window',oldWindow); else Reflect.deleteProperty(globalThis,'window');
    if (oldDocument) Object.defineProperty(globalThis,'document',oldDocument); else Reflect.deleteProperty(globalThis,'document');
  }
});

test("credential management screens never load site analytics", () => {
  assert.equal(isSiteAnalyticsSurface("/dashboard/api-keys"), false);
  assert.equal(isSiteAnalyticsSurface("/dashboard/api-keys/"), false);
});
