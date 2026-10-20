import assert from "node:assert/strict";
import { test } from "node:test";
import { generateBlogApiToken, hashBlogApiToken } from "./blog-api-tokens.ts";
import { articleCreateSchema, articlePatchSchema, forbiddenApiPublication } from "./blog-api-input.ts";
import spec from "./blog-openapi.json" with { type: "json" };
import { readFileSync } from "node:fs";
test("article tokens use independent entropy/salt, never workspace prefix", () => {
  const a=generateBlogApiToken(), b=generateBlogApiToken();
  assert.match(a.token,/^qrs_blog_[A-Za-z0-9_-]{43}$/); assert.notEqual(a.token,b.token); assert.notEqual(a.salt,b.salt);
  assert.equal(hashBlogApiToken(a.token,a.salt),a.keyHash); assert.notEqual(hashBlogApiToken(a.token,b.salt),a.keyHash);
});
test("API allowlist rejects injected ownership, dates, counters and missing version", () => {
  for (const body of [{title:"X"},{version:1,views:5},{version:1,createdById:"admin"},{version:1,renderedHtml:"<script>"},{version:1,expectedUpdatedAt:"2026-01-01T00:00:00Z"}]) assert.equal(articlePatchSchema.safeParse(body).success,false);
  assert.equal(articlePatchSchema.safeParse({version:0,coverImageAlt:"Описание"}).success,true);
  assert.equal(articleCreateSchema.safeParse({title:"X",slug:"x",content:"",status:"published"}).success,true);
  for(const field of ["status","scheduledAt","firstPublishedAt","publishedAt","published"]) assert.equal(forbiddenApiPublication({[field]:null}),true);
});
test("served OpenAPI exactly matches committed YAML and strict request limits", () => {
  assert.deepEqual(JSON.parse(readFileSync("openapi.yaml","utf8")),spec);
  assert.equal(spec.openapi,"3.1.0");
  assert.equal(spec.components.schemas.ArticlePatch.properties.faq.items.properties.question.maxLength,500);
  assert.equal(spec.components.schemas.ArticlePatch.properties.faq.items.properties.answer.maxLength,10000);
  assert.equal(spec.paths["/api/v1/articles/{id}"].delete,undefined);
  assert.equal(spec.info.version,"1.3.0");
  assert.deepEqual(spec.components.schemas.ArticleImageRemove.required,["version","url","remove"]);
  assert.equal(spec.components.schemas.ArticleImageRemove.properties.remove.const,true);
  assert.equal(spec.paths["/api/v1/articles/{id}/images"].patch.requestBody.content["application/json"].schema.oneOf.length,2);
});
