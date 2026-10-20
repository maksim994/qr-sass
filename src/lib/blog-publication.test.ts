import assert from "node:assert/strict";
import { test } from "node:test";
import { moscowInputToIso, formatMoscowInput } from "@/lib/blog-publication";
import { prepareArticleSave } from "@/lib/blog-editor";
test("Moscow scheduling is independent of browser/server timezone and rejects invalid calendar dates", () => {
  assert.equal(moscowInputToIso("2026-10-20T14:30"), "2026-10-20T11:30:00.000Z");
  assert.equal(formatMoscowInput("2026-10-20T23:30:00Z"), "2026-10-21T02:30");
  for (const input of ["", "2026-02-30T14:30", "2026-10-20T24:10", "2026-13-20T14:30", "20.10.2026 14:30"]) assert.equal(moscowInputToIso(input), null);
});
test("scheduled and draft articles never expose publishedAt; first publication is deferred", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  const input = { title: "Тест", slug: "test", content: "## Тест" };
  const post = prepareArticleSave({ ...input, status: "scheduled", scheduledAt: "2026-10-20T14:00:00+03:00" }, null, now);
  assert.equal(post.publishedAt, null);
  assert.equal(post.firstPublishedAt, null);
  assert.equal(post.scheduledAt?.toISOString(), "2026-10-20T11:00:00.000Z");
  assert.equal(prepareArticleSave({ ...input, status: "draft", published: true }, null, now).publishedAt, null);
  for (const scheduledAt of [null, "2026-10-20T10:00:00Z", "2026-10-19T10:00:00Z"]) assert.throws(() => prepareArticleSave({ ...input, status: "scheduled", scheduledAt }, null, now), /будущие дату/);
});
