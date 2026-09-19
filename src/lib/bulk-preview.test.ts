import assert from "node:assert/strict";
import { test } from "node:test";
import { previewBulkCsv } from "./bulk-preview.ts";

test("single URL column is valid despite delimiter auto-detection warning", () => {
  const result = previewBulkCsv('url\nhttps://example.com\n');
  assert.equal(result.issues.length,0); assert.equal(result.rows.length,1);
});
test("BOM, semicolon, alias headers and UTM match the bulk API", () => {
  const result=previewBulkCsv('\uFEFF URL Link ;title;utm_campaign\nhttps://example.com?a=1;Меню;лето\n');
  assert.equal(result.issues.length,0);assert.equal(result.rows[0].name,'Меню');assert.equal(new URL(result.rows[0].url).searchParams.get('utm_campaign'),'лето');
});
test("invalid and private URLs are reported rather than silently discarded", () => {
  const result=previewBulkCsv('url,name\nhttps://example.com,OK\nnot-url,Bad\nhttp://127.0.0.1,Private\n');
  assert.equal(result.total,3);assert.equal(result.rows.length,1);assert.deepEqual(result.issues.map(i=>i.record),[2,3]);
});
test("missing column, no data, and malformed records block creation", () => {
  assert(previewBulkCsv('name\nhello').issues.length);
  assert(previewBulkCsv('url\n').issues.length);
  assert(previewBulkCsv('url,name\nhttps://example.com,"unclosed').issues.length);
});
test("quoted commas and long names use the same naming rules as bulk API", () => {
  const result=previewBulkCsv('url,name\nhttps://example.com,"Кафе, меню"\nhttps://example.org,'+'я'.repeat(150));
  assert.equal(result.issues.length,0);assert.equal(result.rows[0].name,'Кафе, меню');assert.equal(result.rows[1].name.length,120);
});
