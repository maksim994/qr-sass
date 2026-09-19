import assert from "node:assert/strict";
import { test } from "node:test";
import { csvEscape, csvRow } from "./csv.ts";

test("csvEscape keeps ordinary text", () => {
  assert.equal(csvEscape("Меню кафе"), "Меню кафе");
  assert.equal(csvEscape(12), "12");
  assert.equal(csvEscape(null), "");
});

test("csvEscape quotes commas and doubled quotes", () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
});

test("csvEscape keeps spreadsheet formulas as text", () => {
  assert.equal(csvEscape("=1+1"), `"'=1+1"`);
  assert.equal(csvEscape("+1+1"), `"'+1+1"`);
  assert.equal(csvEscape("-2+3"), `"'-2+3"`);
  assert.equal(csvEscape("@SUM(A1)"), `"'@SUM(A1)"`);
  assert.equal(csvEscape("\t=1+1"), `"'` + `\t=1+1"`);
  assert.equal(csvEscape(" =HYPERLINK(1)"), `"' =HYPERLINK(1)"`);
});

test("csvRow joins escaped cells", () => {
  assert.equal(csvRow(["ok", "=1+1"]), `ok,"'=1+1"`);
});
