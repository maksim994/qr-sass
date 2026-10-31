import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "./env.ts";
import { authenticateArticlePublication } from "./blog-api-publication.ts";
import { articlePublishSchema, forbiddenApiPublication } from "./blog-api-input.ts";
import { BlogApiAuthError, generateBlogApiToken } from "./blog-api-tokens.ts";
import { blogApiError } from "./blog-api.ts";
import spec from "./blog-openapi.json" with { type: "json" };
import { randomBytes } from "node:crypto";

test("publication requires its separate timing-safe credential; disabled and old keys get 403", (context) => {
  const previous = env.QRS_ARTICLES_PUBLISH_TOKEN;
  context.after(() => { env.QRS_ARTICLES_PUBLISH_TOKEN = previous; });
  const token = randomBytes(32).toString("base64url");
  env.QRS_ARTICLES_PUBLISH_TOKEN = token;
  const request = (auth?: string) => new Request("https://qr-s.ru/api/v1/articles/id/publish", { headers: { ...(auth ? { Authorization: auth } : {}), Cookie: "qr_saas_session=admin" } });
  assert.doesNotThrow(() => authenticateArticlePublication(request(`Bearer ${token}`)));
  for (const auth of [undefined, `Bearer ${generateBlogApiToken().token}`, "Bearer wrong", `Basic ${token}`, `Bearer ${token}x`]) {
    assert.throws(() => authenticateArticlePublication(request(auth)), (error) => error instanceof BlogApiAuthError && error.status === 403);
  }
  for (const disabled of [undefined, ""]) {
    env.QRS_ARTICLES_PUBLISH_TOKEN = disabled;
    assert.throws(() => authenticateArticlePublication(request(`Bearer ${token}`)), (error) => error instanceof BlogApiAuthError && error.status === 403);
  }
});

test("publish requires only a version and never widens the existing PATCH permissions", () => {
  for (const body of [{}, { version: -1 }, { version: 0.5 }, { version: "1" }, { version: 1, content: "injected" }, { version: 1, publishedAt: null }]) assert.equal(articlePublishSchema.safeParse(body).success, false);
  assert.deepEqual(articlePublishSchema.parse({ version: 0 }), { version: 0 });
  assert.ok(forbiddenApiPublication({ version: 1, status: "published" }));
});

test("publication errors preserve status/code, private response headers and Retry-After", async () => {
  const denied = blogApiError(new BlogApiAuthError("denied", 403));
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, "FORBIDDEN");
  assert.equal(denied.headers.get("www-authenticate"), null);
  const limited = blogApiError(new BlogApiAuthError("limited", 429, 3600));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
  assert.match(limited.headers.get("cache-control")!, /no-store/);
});

test("OpenAPI publication uses a separate security scheme and mandatory version", () => {
  const publish = spec.paths["/api/v1/articles/{id}/publish"].post;
  assert.deepEqual(publish.security, [{ ArticlePublishBearer: [] }]);
  assert.deepEqual(spec.components.schemas.ArticlePublish.required, ["version"]);
  assert.equal(spec.components.schemas.ArticlePublish.additionalProperties, false);
  assert.ok(publish.responses[403]);
  assert.ok(publish.responses[409]);
  assert.ok(publish.responses[429].headers["Retry-After"]);
  assert.deepEqual(spec.paths["/api/v1/articles/{id}"].patch.security, [{ ArticleBearer: [] }]);
});
