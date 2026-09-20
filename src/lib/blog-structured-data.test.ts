import assert from "node:assert/strict";
import { test } from "node:test";
import { formatStructuredDataForEdit } from "@/lib/blog-structured-data";

test("editing a post without custom JSON-LD leaves the field empty", () => {
  for (const raw of [null, undefined, "", "   "]) {
    assert.equal(formatStructuredDataForEdit(raw), "");
  }
});

test("editing a post preserves nested JSON-LD and formats it for the textarea", () => {
  const data = { "@type": "Article", author: { name: "Автор" } };
  const formatted = formatStructuredDataForEdit(JSON.stringify(data));
  assert.deepEqual(JSON.parse(formatted), data);
  assert.match(formatted, /\n  "@type"/);
});

test("editing a post with malformed JSON-LD keeps the original text for correction", () => {
  const raw = '  {"@type": "Article", }';
  assert.equal(formatStructuredDataForEdit(raw), raw);
});
