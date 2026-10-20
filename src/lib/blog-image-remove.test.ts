import assert from "node:assert/strict";
import { test } from "node:test";
import { removeArticleImage } from "./blog-image-remove.ts";
import { prepareArticleImageRemoval } from "./blog-image-removal.ts";
import { prepareArticleSave, BlogEditorError, type EditableArticle } from "./blog-editor.ts";
import { articleImagePatchSchema } from "./blog-image-input.ts";

const url = "https://s3.mvmolkov.ru/qr/blog/content/UMbjoWh-Pkyz.webp";
const prefix = '<h2 id="keep">До</h2>\n<p>Пробелы  &amp; сущности.</p>\n';
const suffix = '\n<h2 id="after">После</h2><table><tr><td>1</td></tr></table><a href="/blog/x">Ссылка</a>';
const image = `<img SRC='${url}' alt="Таблица" width=1200>`;
const figure = `<figure class="inline-quad" data-slot="inline_2">\n${image}<figcaption>Подпись</figcaption>\n</figure>`;

test("WhatsApp figure and caption are removed with all surrounding bytes intact", () => {
  const result = removeArticleImage(prefix + figure + suffix, url);
  assert.deepEqual(result, { content: prefix + suffix, count: 1, found: true });
});
test("empty link/paragraph wrappers disappear, but text, comments and other media survive", () => {
  for (const fragment of [image, `<a href="/x"> ${image} </a>`, `<p>\n<a href="/x">${image}</a>\n</p>`])
    assert.equal(removeArticleImage(prefix + fragment + suffix, url).content, prefix + suffix);
  for (const [fragment, expected] of [
    [`<p>Текст ${image} после</p>`, '<p>Текст  после</p>'],
    [`<a href="/x">${image}ссылка</a>`, '<a href="/x">ссылка</a>'],
    [`<p><!-- keep -->${image}</p>`, '<p><!-- keep --></p>'],
    [`<figure>${image}<img src="/other"><figcaption>Общая подпись</figcaption></figure>`, '<figure><img src="/other"><figcaption>Общая подпись</figcaption></figure>'],
    [`<figure>${image}<video src="/v"></video><figcaption>Видео</figcaption></figure>`, '<figure><video src="/v"></video><figcaption>Видео</figcaption></figure>'],
  ]) assert.equal(removeArticleImage(fragment, url).content, expected);
});
test("matches exact src or any srcset candidate, counting images rather than attributes", () => {
  const html = `<figure><img src="/large" srcset="${url} 480w, /large 960w"></figure>`;
  assert.equal(removeArticleImage(html, url).content, "");
  assert.equal(removeArticleImage(`<img src="${url}" srcset="${url} 480w">`, url).count, 1);
  assert.equal(removeArticleImage(`<img src="${url}.other" srcset="${url}.other 480w">`, url).found, false);
  const query = 'https://example.org/img?a=1&b=2';
  assert.equal(removeArticleImage('<img src="https://example.org/img?a=1&amp;b=2">', query).content, "");
  assert.equal(removeArticleImage('<img src="/x" srcset="data:image/png;base64,ABC 480w, /target 960w">', '/target').content, "");
});
test("Markdown removes inline images and uploaded raw figures; preserves literal/code examples", () => {
  for (const fragment of [`![описание](${url})`, `![alt](<${url}> "Title")`, `![вложенный [alt]](${url})`, figure])
    assert.equal(removeArticleImage(prefix + fragment + suffix, url, "markdown").content, prefix + suffix);
  const literal = [
    `\`![alt](${url})\``,
    `\`\` a \` ![alt](${url}) \`\``,
    `\`\`\`html\n${figure}\n![alt](${url})\n\`\`\``,
    `    ![alt](${url})`,
    `<pre>${image}</pre>`,
    `<code>${image}</code>`,
    `<!-- ${image} ![alt](${url}) -->`,
    `<div title="![alt](${url})">Текст</div>`,
    `\\![alt](${url})`,
    `<script>const x = '![alt](${url})';</script>`,
  ];
  for (const source of literal) assert.deepEqual(removeArticleImage(source, url, "markdown"), { content: source, found: false, count: 0 }, source);
  const balanced = 'https://example.org/a_(b).webp';
  assert.equal(removeArticleImage(`before ![alt](${balanced} "подпись (x)") after`, balanced, "markdown").content, 'before  after');
});
test("duplicate policy, missing URL and cover guard are identical for saves and previews", () => {
  assert.throws(() => prepareArticleImageRemoval(figure + figure, { url, remove: true }, "html"), error => error instanceof BlogEditorError && error.status === 409 && error.details?.count === 2);
  assert.equal(prepareArticleImageRemoval(figure + figure, { url, remove: true, all: true }, "html").content, "");
  assert.throws(() => prepareArticleImageRemoval(figure, { url: '/missing', remove: true }, "html"), error => error instanceof BlogEditorError && error.status === 404);
  assert.throws(() => prepareArticleImageRemoval(figure, { url, remove: true }, "html", url), error => error instanceof BlogEditorError && error.status === 400 && error.message === "Для обложки используйте coverImageUrl");
  assert.equal(removeArticleImage(figure + `![alt](${url})`, url, 'markdown').count, 2);
});
test("HTML deletion allowlist preserves dates/legacy and prevents unrelated edits", () => {
  const then = new Date("2026-07-14T08:00:00Z"), now = new Date("2026-10-20T12:00:00Z");
  const existing: EditableArticle = {
    title: "WhatsApp", slug: "qr-kod-dlya-whatsapp", content: prefix + figure + suffix, format: "html",
    metaTitle: null, metaDescription: null, excerpt: null, coverImageUrl: null, authorName: null, structuredData: null,
    readingTimeMinutes: 5, categoryId: null, publishedAt: then, firstPublishedAt: then, updatedAt: then, contentUpdatedAt: then,
    legacyHtml: "Original legacy backup", faq: [], showPrintSizeIntro: true,
  };
  const change = { url, remove: true } as const;
  const content = prepareArticleImageRemoval(existing.content, change, "html").content;
  const saved = prepareArticleSave({ content, minorEdit: true }, existing, now, change);
  for (const key of ['contentUpdatedAt', 'publishedAt', 'firstPublishedAt', 'legacyHtml', 'readingTimeMinutes', 'format'] as const)
    assert.deepEqual(saved[key], existing[key]);
  assert.equal(saved.content, prefix + suffix);
  assert.deepEqual(prepareArticleSave({ content }, existing, now, change).contentUpdatedAt, now);
  assert.throws(() => prepareArticleSave({ content: content + '<p>Extra</p>' }, existing, now, change), /только для чтения/);
  assert.throws(() => prepareArticleSave({ content }, existing, now), /только для чтения/);
});
test("remove request strictly requires version and true discriminator and excludes replacement fields", () => {
  assert.equal(articleImagePatchSchema.safeParse({ version: 1, url, remove: true, all: true, minorEdit: true }).success, true);
  assert.equal(articleImagePatchSchema.safeParse({ version: 1, url, alt: 'Описание' }).success, true);
  for (const body of [
    { url, remove: true }, { version: 1, url, remove: false }, { version: 1, url, remove: true, alt: 'x' },
    { version: 1, url, remove: true, newUrl: url }, { version: 1, url, remove: true, all: 'true' },
    { version: 1, url, remove: true, content: 'x' }, { version: Number.MAX_SAFE_INTEGER + 1, url, remove: true },
  ]) assert.equal(articleImagePatchSchema.safeParse(body).success, false);
});
