// Dedicated synthetic databases + S3 stub only. Never use the production URL or credentials.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";
import { BLOG_REDIRECTS } from "../src/lib/blog-redirects.ts";
const database = new URL(process.env.DATABASE_URL),
  origin = process.env.BLOG_TEST_ORIGIN || "http://localhost:3006",
  s3 = process.env.BLOG_TEST_S3_ORIGIN || "http://localhost:55439";
const isolated =
  process.env.BLOG_ASSETS_ISOLATED_TEST === "1" &&
  database.pathname === "/qr_stage4_smoke";
assert.ok(
  isolated ||
    (["localhost", "127.0.0.1"].includes(database.hostname) &&
      database.pathname === "/qr_tz06_stage4"),
);
assert.ok(process.env.JWT_SECRET?.startsWith("local-tz06-"));
assert.ok(
  isolated ||
    (["localhost", "127.0.0.1"].includes(new URL(origin).hostname) &&
      ["localhost", "127.0.0.1"].includes(new URL(s3).hostname)),
);
const db = getDb(),
  run = Date.now();
let checks = 0;
const admin = await db.user.upsert({
  where: { email: "tz06-admin@example.invalid" },
  create: {
    email: "tz06-admin@example.invalid",
    passwordHash: await bcrypt.hash("Local-TZ06-Only-2026!", 10),
    isAdmin: true,
  },
  update: {},
});
const session = await new SignJWT({
  email: admin.email,
  sv: admin.sessionVersion,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(admin.id)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
async function req(
  path,
  method = "GET",
  body,
  key,
  adminAuth = false,
  csrf = "stage4",
) {
  const headers = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  if (adminAuth) {
    headers.Cookie = `qr_saas_session=${session}; csrf_token=stage4`;
    headers["x-csrf-token"] = csrf;
    headers.Origin = origin;
  }
  if (body !== undefined && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(origin + path, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    redirect: "manual",
  });
  const raw = await response.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {}
  return { response, json, raw };
}
async function expect(
  path,
  method,
  body,
  key,
  status = 200,
  adminAuth = false,
  csrf,
) {
  const r = await req(path, method, body, key, adminAuth, csrf);
  assert.equal(
    r.response.status,
    status,
    `${method} ${path}: ${r.json?.error || r.response.status}`,
  );
  checks++;
  return r;
}
try {
  const keyrow = (
      await expect(
        "/api/admin/blog/tokens",
        "POST",
        { name: `Синтетический этап 4 ${run}` },
        undefined,
        201,
        true,
      )
    ).json.data,
    key = keyrow.token;
  const redirects = "/api/v1/redirects",
    adminRedirects = "/api/admin/blog/redirects";
  await expect(redirects, "GET", undefined, undefined, 401);
  await expect(
    redirects,
    "POST",
    { source: "/test", target: "/other" },
    undefined,
    401,
    true,
  );
  await expect(
    adminRedirects,
    "POST",
    { source: "/test", target: "/other" },
    undefined,
    403,
    true,
    "wrong",
  );
  const listed = (await expect(redirects, "GET", undefined, key)).json.data;
  assert.equal(
    listed.filter(
      (r) =>
        Object.entries(BLOG_REDIRECTS).some(
          ([a, b]) => r.source === `/blog/${a}` && r.target === `/blog/${b}`,
        ) && r.code === 301,
    ).length,
    4,
  );
  assert.equal(listed.filter((r) => r.locked && r.code === 308).length, 2);
  for (const [from, to] of Object.entries(BLOG_REDIRECTS)) {
    const r = await expect(`/blog/${from}`, "GET", undefined, undefined, 301);
    assert.equal(
      new URL(r.response.headers.get("location"), origin).pathname,
      `/blog/${to}`,
    );
  }
  const legacySlug = Object.keys(BLOG_REDIRECTS)[0],
    legacyRule = listed.find((r) => r.source === `/blog/${legacySlug}`);
  const legacyPublished = await db.blogPost.upsert({
    where: { slug: legacySlug },
    create: {
      slug: legacySlug,
      title: "Синтетическая прежняя статья",
      content: "<p>Legacy source</p>",
      publishedAt: new Date("2026-07-01T10:00:00Z"),
    },
    update: {},
  });
  const legacyVersion = (
    await expect(
      `/api/v1/articles/${legacyPublished.id}`,
      "GET",
      undefined,
      key,
    )
  ).json.data.version;
  await expect(
    `/api/v1/articles/${legacyPublished.id}`,
    "PATCH",
    {
      version: legacyVersion,
      metaTitle: "Синтетическая проверка прежнего URL",
    },
    key,
  );
  await expect(
    adminRedirects + "/" + legacyRule.id,
    "DELETE",
    undefined,
    undefined,
    200,
    true,
  );
  await expect(`/blog/${legacySlug}`, "GET", undefined, undefined, 200);
  await expect(
    redirects,
    "POST",
    { source: legacyRule.source, target: legacyRule.target },
    key,
    400,
  );
  await expect(
    adminRedirects,
    "POST",
    {
      source: legacyRule.source,
      target: legacyRule.target,
      comment: "Восстановление прежнего правила",
    },
    undefined,
    201,
    true,
  );
  await expect(`/blog/${legacySlug}`, "GET", undefined, undefined, 301);
  for (const source of [
    "/",
    "/blog",
    "/qr-menu",
    "/pricing",
    "/admin/x",
    "/R/existing",
    "/p/a",
    "/g/a",
    "/v/a",
    "/api/v1/articles",
    "/robots.txt",
  ])
    await expect(redirects, "POST", { source, target: "/blog/end" }, key, 400);
  const published = await db.blogPost.create({
    data: {
      slug: `assets-published-${run}`,
      title: "Синтетическая опубликованная статья",
      format: "markdown",
      content: "## Начало",
      publishedAt: new Date("2026-07-01T10:00:00Z"),
      firstPublishedAt: new Date("2026-07-01T10:00:00Z"),
      status: "published",
    },
  });
  await expect(
    redirects,
    "POST",
    { source: `/blog/${published.slug.toUpperCase()}/`, target: "/elsewhere" },
    key,
    400,
  );
  const source = `/assets-old-${run}`,
    target = `/assets-final-${run}`;
  const created = (
    await expect(
      redirects,
      "POST",
      { source: source.toUpperCase() + "/", target, comment: "Проверка API" },
      key,
      201,
    )
  ).json.data;
  assert.equal(created.source, source);
  let response = await expect(
    source + "?utm_source=test",
    "GET",
    undefined,
    undefined,
    301,
  );
  assert.equal(
    new URL(response.response.headers.get("location"), origin).pathname,
    target,
  );
  assert.equal(
    new URL(response.response.headers.get("location"), origin).search,
    "?utm_source=test",
  );
  await expect(redirects, "POST", { source: target, target: source }, key, 400);
  await expect(
    redirects,
    "POST",
    { source: `/assets-chain-${run}`, target: source },
    key,
    409,
  );
  await expect(redirects, "POST", { source: target, target: "/end" }, key, 409);
  await expect(redirects, "DELETE", {}, key, 405);
  await expect(
    adminRedirects + "/" + created.id,
    "DELETE",
    undefined,
    key,
    401,
  );
  assert.equal(
    (
      await db.blogEvent.findFirstOrThrow({
        where: { postId: `redirect:${created.id}`, type: "redirect_create" },
      })
    ).actorName,
    `API: ${keyrow.name}`,
  );
  const raceA = `/assets-race-a-${run}`,
    raceB = `/assets-race-b-${run}`;
  const races = await Promise.all([
    req(redirects, "POST", { source: raceA, target: raceB }, key),
    req(redirects, "POST", { source: raceB, target: raceA }, key),
  ]);
  assert.deepEqual(races.map((r) => r.response.status).sort(), [201, 400]);
  checks++;
  const adminRule = (
    await expect(
      adminRedirects,
      "POST",
      {
        source: `/assets-admin-${run}`,
        target: "https://example.invalid/CaseSensitive",
        comment: "Админ",
      },
      undefined,
      201,
      true,
    )
  ).json.data;
  await expect(
    adminRedirects + "/" + adminRule.id,
    "DELETE",
    undefined,
    undefined,
    200,
    true,
  );
  await expect(
    adminRedirects + "/" + created.id,
    "DELETE",
    undefined,
    undefined,
    200,
    true,
  );
  await expect(source, "GET", undefined, undefined, 404);
  const draft = (
    await expect(
      "/api/v1/articles",
      "POST",
      {
        title: "Синтетические изображения",
        slug: `assets-draft-${run}`,
        content: "## Изображения",
      },
      key,
      201,
    )
  ).json.data;
  const png = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#526580" },
  })
    .png()
    .toBuffer();
  const path = `/api/v1/articles/${draft.id}/images`;
  const form = (
    kind,
    version,
    alt = "Синтетическое изображение",
    file = png,
    type = "image/png",
  ) => {
    const data = new FormData();
    data.set("file", new File([file], "fixture.png", { type }));
    data.set("kind", kind);
    data.set("version", String(version));
    if (alt !== null) data.set("alt", alt);
    return data;
  };
  await expect(path, "POST", form("content", 1, null), key, 400);
  await expect(path, "POST", form("content", 1, "  "), key, 400);
  await expect(
    path,
    "POST",
    form("content", 1, "Размер", Buffer.alloc(10 * 1024 * 1024 + 1)),
    key,
    400,
  );
  await expect(path, "POST", form("content", 0), key, 409);
  await expect(
    path,
    "POST",
    form("content", 1, "Описание", png, "image/jpeg"),
    key,
    400,
  );
  await expect(
    path,
    "POST",
    form(
      "content",
      1,
      "Описание",
      Buffer.from('<svg onload="alert(1)"></svg>'),
      "image/svg+xml",
    ),
    key,
    400,
  );
  // Redirect checks intentionally consume the same per-token budget; reset only the synthetic fixture.
  await db.blogApiToken.update({
    where: { id: keyrow.id },
    data: { windowStartedAt: null, requestCount: 0 },
  });
  const uploaded = (await expect(path, "POST", form("content", 1), key, 201))
    .json.data;
  assert.equal(uploaded.article.status, "draft");
  assert.equal(uploaded.article.version, 2);
  assert.deepEqual(
    uploaded.image.variants.map((v) => v.width),
    [480, 960, 1600],
  );
  assert.ok(uploaded.article.content.includes(uploaded.image.figure));
  assert.match(uploaded.article.renderedHtml, /srcset=/);
  assert.match(uploaded.article.renderedHtml, /width="1600" height="800"/);
  for (const variant of uploaded.image.variants) {
    const r = await fetch(variant.url);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /image\/webp/);
    const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, variant.width);
    assert.equal(meta.height, variant.height);
  }
  const alt = (
    await expect(
      path,
      "PATCH",
      { version: 2, url: uploaded.image.url, alt: 'Новый "alt" <safe>' },
      key,
    )
  ).json.data;
  assert.equal(alt.version, 3);
  assert.ok(alt.renderedHtml.includes("Новый"));
  assert.ok(!alt.renderedHtml.includes("<script>"));
  await expect(
    path,
    "PATCH",
    { version: 2, url: uploaded.image.url, alt: "Stale" },
    key,
    409,
  );
  await expect(
    path,
    "PATCH",
    { version: 3, url: "https://example.invalid/missing.webp", alt: "Missing" },
    key,
    404,
  );
  const cover = (
    await expect(path, "POST", form("cover", 3, "Обложка"), key, 201)
  ).json.data;
  assert.equal(cover.article.coverImageUrl, cover.image.url);
  assert.equal(cover.article.coverImageAlt, "Обложка");
  assert.equal(cover.article.version, 4);
  const htmlPrefix = '<h2 id="keep">Keep  &amp; source</h2>\n',
    htmlSuffix = '\n<p data-legacy="yes">Keep suffix</p>',
    imageUrl = "https://example.invalid/legacy.webp";
  const legacy = await db.blogPost.create({
    data: {
      slug: `assets-legacy-${run}`,
      title: "Синтетический HTML",
      content: htmlPrefix + `<img src="${imageUrl}" alt="Old">` + htmlSuffix,
      publishedAt: new Date("2026-07-01T10:00:00Z"),
    },
  });
  const legacyAlt = (
    await expect(
      `/api/v1/articles/${legacy.id}/images`,
      "PATCH",
      { version: 0, url: imageUrl, alt: "Описание старой картинки" },
      key,
    )
  ).json.data;
  assert.equal(legacyAlt.format, "html");
  assert.ok(
    legacyAlt.content.startsWith(htmlPrefix) &&
      legacyAlt.content.endsWith(htmlSuffix),
  );
  assert.equal(
    (
      await db.blogRevision.findUniqueOrThrow({
        where: { postId_number: { postId: legacy.id, number: 0 } },
      })
    ).snapshot.content,
    legacy.content,
  );
  await expect(
    `/api/v1/articles/${legacy.id}`,
    "PATCH",
    { version: 1, content: "Arbitrary HTML replacement" },
    key,
    400,
  );
  const pubCover = (
    await expect(
      `/api/v1/articles/${published.id}/images`,
      "POST",
      form("cover", 0, "Синтетическая обложка"),
      key,
      201,
    )
  ).json.data;
  const publicPage = await expect(`/blog/${published.slug}`, "GET");
  assert.ok(
    publicPage.raw.includes(`srcSet="`) || publicPage.raw.includes('srcset="'),
  );
  assert.ok(publicPage.raw.includes(pubCover.image.url));
  assert.ok(
    await db.blogRevision.count({
      where: { postId: published.id, source: "api" },
    }),
  );
  // Competing uploads either commit one image/version or clean their own unused objects.
  const countBefore = await db.blogImage.count(),
    objectsBefore = (await (await fetch(s3 + "/stats")).json()).keys.length;
  const concurrent = await Promise.all([
    req(path, "POST", form("content", 4, "A"), key),
    req(path, "POST", form("content", 4, "B"), key),
  ]);
  assert.deepEqual(concurrent.map((r) => r.response.status).sort(), [201, 409]);
  assert.equal(await db.blogImage.count(), countBefore + 1);
  assert.equal(
    (await (await fetch(s3 + "/stats")).json()).keys.length,
    objectsBefore + 3,
  );
  checks++;
  // Publishing a draft on a redirect source must fail, even after that redirect was created earlier.
  const competing = await db.blogPost.create({
    data: {
      slug: `assets-publish-race-${run}`,
      title: "Синтетическая гонка публикации",
      content: "Draft",
      format: "markdown",
    },
  });
  const publicationRace = await Promise.all([
    req(
      redirects,
      "POST",
      { source: `/blog/${competing.slug}`, target: "/elsewhere" },
      key,
    ),
    req(
      `/api/admin/blog/${competing.id}`,
      "PATCH",
      {
        status: "published",
        expectedUpdatedAt: competing.updatedAt.toISOString(),
      },
      undefined,
      true,
    ),
  ]);
  assert.equal(
    publicationRace.filter((r) => r.response.status < 300).length,
    1,
  );
  const competingAfter = await db.blogPost.findUniqueOrThrow({
      where: { id: competing.id },
    }),
    competingRule = await db.blogRedirect.findUnique({
      where: { source: `/blog/${competing.slug}` },
    });
  assert.ok(!(competingAfter.publishedAt && competingRule));
  checks++;
  const blocked = await db.blogPost.create({
    data: {
      slug: `assets-blocked-${run}`,
      title: "Синтетический черновик",
      content: "Draft",
      format: "markdown",
    },
  });
  await expect(
    redirects,
    "POST",
    { source: `/blog/${blocked.slug}`, target: "/elsewhere" },
    key,
    201,
  );
  await expect(
    `/api/admin/blog/${blocked.id}`,
    "PATCH",
    { status: "published", expectedUpdatedAt: blocked.updatedAt.toISOString() },
    undefined,
    409,
    true,
  );
  await db.blogApiToken.update({
    where: { id: keyrow.id },
    data: { requestCount: 60, windowStartedAt: new Date() },
  });
  await expect(redirects, "GET", undefined, key, 429);
  await expect(path, "POST", form("content", 5), key, 429);
  await expect(
    `/api/admin/blog/tokens/${keyrow.id}`,
    "DELETE",
    undefined,
    undefined,
    200,
    true,
  );
  await expect(redirects, "GET", undefined, key, 401);
  await expect(
    path,
    "PATCH",
    { version: 5, url: uploaded.image.url, alt: "Revoked" },
    key,
    401,
  );
  const schema = (await req("/api/v1/openapi.json")).json;
  assert.ok(
    schema.paths["/api/v1/redirects"] &&
      schema.paths["/api/v1/articles/{id}/images"],
  );
  const report = {
    success: true,
    checks,
    legacyRedirects: 4,
    redirectConcurrency: [201, 400],
    imageConcurrency: [201, 409],
    webpWidths: [480, 960, 1600],
    mandatoryAlt: true,
    oldHtmlAltOnly: true,
    sourcePublicationProtected: true,
    failedUploadCleanup: true,
  };
  mkdirSync("outputs/tz06-stage4", { recursive: true });
  writeFileSync(
    "outputs/tz06-stage4/integration.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await db.$disconnect();
}
