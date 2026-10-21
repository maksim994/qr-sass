import assert from "node:assert/strict";
import { test } from "node:test";
import { articleRevisionSchema } from "./blog-api-input.ts";
import { assertPendingUnchanged } from "./blog-pending-revision.ts";
import spec from "./blog-openapi.json" with { type: "json" };
test("pending edits reject identity, publication, timestamps and minorEdit", () => {
  for (const field of ["slug", "published", "status", "publishedAt", "scheduledAt", "firstPublishedAt", "contentUpdatedAt", "updatedAt", "minorEdit", "createdById", "views"]) assert.equal(articleRevisionSchema.safeParse({ [field]: "injected" }).success, false, field);
  assert.equal(articleRevisionSchema.safeParse({ title: "Новый заголовок", content: "## Текст", faq: [{question:"Вопрос?",answer:"Ответ"}], version: 0 }).success, true);
  assert.equal(articleRevisionSchema.safeParse({ content: "## Новый Markdown", format: "markdown", confirmConversion: true }).success, true);
});
test("publishing requires both the reviewed pending revision and its live base", () => {
  const date = new Date("2026-10-21T07:00:00Z");
  const pending = { id: "pending", baseUpdatedAt: date, updatedAt: date };
  assert.doesNotThrow(() => assertPendingUnchanged({updatedAt:date},pending,{id:"pending",updatedAt:date.toISOString()}));
  for (const expected of [{id:"different",updatedAt:date.toISOString()},{id:"pending",updatedAt:new Date(0).toISOString()}]) assert.throws(() => assertPendingUnchanged({updatedAt:date},pending,expected), /уже изменены/);
  assert.throws(() => assertPendingUnchanged({updatedAt:new Date(date.getTime()+1)},pending), /уже изменены/);
});
test("OpenAPI exposes pending CRUD and link preview, without a publication method", () => {
  assert.equal(spec.info.version, "1.4.0");
  assert.deepEqual(Object.keys(spec.paths["/api/v1/articles/{id}/revision"]).sort(),["delete","get","parameters","put"]);
  assert.ok(spec.paths["/api/v1/articles/{id}/revision/preview"].post);
  assert.equal("slug" in spec.components.schemas.ArticleRevisionInput.properties, false);
  assert.equal("minorEdit" in spec.components.schemas.ArticleRevisionInput.properties, false);
});
