import assert from "node:assert/strict";
import { test } from "node:test";
import { readBlogFaq } from "@/lib/blog-faq";
import { prepareArticleSave, blogEditorSchema, type EditableArticle } from "@/lib/blog-editor";
import { renderArticleBody, renderLegacyBody, sanitizeArticleHtml } from "@/lib/blog-render";
import { prepareHtmlConversion, normalizeHtmlForDiff } from "@/lib/blog-convert";
import { buildArticleJsonLd, serializeArticleJsonLd } from "@/lib/blog-structured-data";

const then = new Date("2026-07-14T08:00:00.000Z"), now = new Date("2026-10-20T09:00:00.000Z");
const faq = [{ question: "Что такое QR?", answer: "Текст & ответ <без HTML>." }];
const existing: EditableArticle = {
  title: "Заголовок", slug: "legacy", content: '<h2 id="original">Раздел</h2>\n<p>Текст &amp; <b>HTML</b>.</p>', format: "html",
  metaTitle: null, metaDescription: null, excerpt: null, coverImageUrl: null, authorName: null, structuredData: null,
  readingTimeMinutes: 1, categoryId: null, publishedAt: then, firstPublishedAt: null,
  updatedAt: then, contentUpdatedAt: null, legacyHtml: null, faq: [], showPrintSizeIntro: true,
};

test("legacy save preserves source bytes and all editorial/publication dates", () => {
  const result = prepareArticleSave({ content: existing.content, published: true }, existing, now);
  assert.equal(result.content, existing.content);
  assert.deepEqual(result.contentUpdatedAt, then);
  assert.deepEqual(result.publishedAt, then);
  assert.equal(result.format, "html");
});
test("read-only HTML cannot be silently overwritten or converted", () => {
  assert.throws(() => prepareArticleSave({ content: "changed" }, existing), /только для чтения/);
  assert.throws(() => prepareArticleSave({ format: "markdown" }, existing), /подтвердите/);
});
test("confirmed conversion retains exact legacy source on every subsequent save", () => {
  const first = prepareArticleSave({ format: "markdown", content: "## Новый текст", confirmConversion: true }, existing, now);
  assert.equal(first.legacyHtml, existing.content);
  const next = prepareArticleSave({ content: "## Ещё правка" }, { ...existing, ...first }, now);
  assert.equal(next.legacyHtml, existing.content);
  assert.throws(() => prepareArticleSave({ format: "html" }, { ...existing, ...first }), /Возврат в HTML/);
});
test("substantive edits update date; whitespace, flags, category and minor edits do not", () => {
  const markdown = { ...existing, format: "markdown", content: "## Текст\n\nАбзац" };
  for (const input of [{ content: "## Текст\n\n\nАбзац  " }, { showPrintSizeIntro: false }, { categoryId: "other" }, {}, { content: "Новый", minorEdit: true }]) {
    assert.deepEqual(prepareArticleSave(input, markdown, now).contentUpdatedAt, then);
  }
  for (const input of [{ content: "Новый" }, { title: "Другой" }, { metaTitle: "SEO" }, { metaDescription: "Описание" }, { excerpt: "Анонс" }, { faq }, { coverImageUrl: "https://qr-s.ru/test.webp" }]) {
    assert.deepEqual(prepareArticleSave(input, markdown, now).contentUpdatedAt, now);
  }
});
test("publication date survives publish, unpublish and republish; stale writes are rejected", () => {
  const unpublished = prepareArticleSave({ published: false }, existing, now);
  assert.equal(unpublished.publishedAt, null);
  const republished = prepareArticleSave({ publishedAt: now.toISOString() }, { ...existing, ...unpublished }, now);
  assert.deepEqual(republished.publishedAt, then);
  assert.throws(() => prepareArticleSave({ slug: "different" }, { ...existing, ...unpublished }), /Адрес опубликованной/);
  assert.throws(() => prepareArticleSave({ expectedUpdatedAt: now.toISOString() }, existing), /уже изменена/);
});
test("new articles default to Markdown and are sanitized at save", () => {
  const result = prepareArticleSave({ title: "Новая", slug: "new", content: '## Текст\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>' }, null, now);
  assert.equal(result.format, "markdown");
  assert.equal(result.publishedAt, null);
  assert.doesNotMatch(result.renderedHtml!, /onerror|<script/);
});
test("schema rejects malformed fields instead of throwing TypeError", () => {
  for (const input of [{ title: 42 }, { content: {} }, { format: "xml" }, { faq: [{ question: "", answer: "" }] }, { minorEdit: "yes" }, { publishedAt: "wrong" }, { coverImageUrl: "javascript:alert(1)" }, { legacyHtml: "forged" }]) assert.equal(blogEditorSchema.safeParse(input).success, false);
});
test("HTML renderer preserves pre-existing heading IDs algorithm, table wrapper and figures policy", () => {
  const result = renderLegacyBody('<h2 id="manual">Привет мир</h2><figure class="inline-quad" data-slot="inline_1"><img src="/x.png" alt="Фото"></figure><table><thead><tr><th>A</th></tr></thead></table>');
  assert.equal(result.html, '<h2 id="привет-мир">Привет мир</h2><img src="/x.png" alt="Фото"><div class="qrs-article-table-scroll" role="region" aria-label="Таблица с горизонтальной прокруткой" tabindex="0"><table><thead><tr><th>A</th></tr></thead></table></div>');
  assert.deepEqual(result.items, [{ id: "привет-мир", text: "Привет мир" }]);
});
test("Markdown supports explicit H2/H3 anchors, transliteration and unique IDs", () => {
  const result = renderArticleBody("## Привет мир {#manual}\n\n### Тест {#sub}\n\n## Привет мир\n\n## Привет мир\n\n## Совпадение\n\n## Явный {#sovpadenie}", "markdown");
  assert.deepEqual(result.items.map(item => item.id), ["manual", "sub", "privet-mir", "privet-mir-2", "sovpadenie-2", "sovpadenie"]);
  assert.doesNotMatch(result.html, /\{#/);
});
test("GFM tables, strikethrough and task lists render safely", () => {
  const result = renderArticleBody("| A | B |\n|---|---|\n|1|2|\n\n~~old~~\n\n- [x] Done\n- [ ] Todo", "markdown");
  assert.match(result.html, /qrs-article-table-scroll/);
  assert.match(result.html, /<thead>/);
  assert.match(result.html, /<(s|del)>old/);
  assert.match(result.html, /type="checkbox" disabled checked/);
});
test("external links are isolated; internal links and UTM query values survive", () => {
  const result = renderArticleBody('[out](https://example.com/?utm_source=qr-s&utm_medium=article&utm_campaign=test) [in](/blog/test) [same](https://qr-s.ru/blog/test) [fake](https://qr-s.ru.evil.test/)', "markdown");
  assert.equal((result.html.match(/target="_blank" rel="noopener"/g) ?? []).length, 2);
  assert.match(result.html, /href="\/blog\/test">in/);
  assert.match(result.html, /href="https:\/\/qr-s.ru\/blog\/test">same/);
  assert.match(result.html, /utm_source=qr-s&amp;utm_medium=article&amp;utm_campaign=test/);
});
test("FAQ appears once at marker before next section; codes containing marker are not replaced", () => {
  const result = renderArticleBody("## Начало {#start}\n\n[[faq]]\n\n[[faq]]\n\n## Канал {#channel}\n\n`[[faq]]`", "markdown", faq);
  assert.equal((result.html.match(/id="faq"/g) ?? []).length, 1);
  assert.ok(result.html.indexOf('id="faq"') < result.html.indexOf('id="channel"'));
  assert.match(result.html, /<code>\[\[faq\]\]<\/code>/);
  assert.match(result.html, /Текст &amp; ответ &lt;без HTML&gt;/);
  assert.deepEqual(result.items.map(item => item.id), ["start", "faq", "channel"]);
});
test("FAQ replaces an explicitly imported legacy section without changing stored source", () => {
  for (const format of ["html", "markdown"] as const) {
    const source = format === "html" ? "<h2>Частые вопросы</h2><h3>Старый</h3><p>Ответ</p><h2>Далее</h2>" : "## Частые вопросы\n\n### Старый\n\nОтвет\n\n## Далее";
    const result = renderArticleBody(source, format, faq);
    assert.equal((result.html.match(/Частые вопросы/g) ?? []).length, 1);
    assert.doesNotMatch(result.html, /Старый/);
    for (const item of result.items) assert.ok(result.html.includes(`id="${item.id}"`));
  }
});
test("server sanitization rejects XSS, data protocols, SVG, style and iframe on save/render", () => {
  const source = '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))\n\n[x](data:text/html,test)\n\n<iframe src="https://evil.test"></iframe>\n\n<style>body{display:none}</style>\n\n<svg onload="alert(1)"></svg>\n\n<figure class="inline-quad" data-slot="inline_1"><img src="https://qr-s.ru/x.webp" width="400" height="200" loading="lazy" onload="bad()"><figcaption>Подпись</figcaption></figure>';
  const result = renderArticleBody(source, "markdown");
  assert.doesNotMatch(result.html, /<script|<iframe|<style|<svg|\sonerror=|\sonload=|href="(?:javascript:|data:)/i);
  assert.match(result.html, /<figure class="inline-quad" data-slot="inline_1">/);
  assert.match(result.html, /width="400" height="200" loading="lazy"/);
  assert.match(result.html, /<figcaption>Подпись<\/figcaption>/);
  assert.equal(renderArticleBody('<figure class="inline-quad" data-slot="inline_2"></figure>', "markdown").html, "");
  assert.doesNotMatch(sanitizeArticleHtml('<a href="jav&#x61;script:bad()">x</a>'), /href=/);
});
test("raw HTML whitelist does not allow custom headings, links or controls", () => {
  const result = renderArticleBody('<h2 id="fake">Raw</h2>\n\n<a href="https://evil.test">x</a>\n\n<input type="text" value="secret">', "markdown");
  assert.doesNotMatch(result.html, /<h2|<a |<input/);
});
test("conversion provides source and normalized rendered diff without mutating HTML", () => {
  const html = '<h2 id="manual">Заголовок</h2><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>';
  const result = prepareHtmlConversion(html, []);
  assert.match(result.markdown, /## Заголовок \{#manual\}/);
  assert.match(result.markdown, /\| A \|/);
  assert.ok(result.before.html && result.after.html && result.diff.length);
  assert.equal(normalizeHtmlForDiff('<img width="20" alt="x">'), normalizeHtmlForDiff('<img alt="x" width="20">'));
});
test("field-owned BlogPosting/FAQPage win over manual nested duplicates and JSON-LD is script-safe", () => {
  const result = buildArticleJsonLd({ base: "https://qr-s.ru", articleUrl: "https://qr-s.ru/blog/test", title: "H1", seoTitle: "Meta", seoDescription: "Описание", coverImageUrl: null, publishedAt: then, updatedAt: now, likes: 0, authorName: null, faq,
    structuredData: JSON.stringify({ "@graph": [{ "@type": ["BlogPosting", "Article"], headline: "WRONG" }, { "@type": "FAQPage", mainEntity: [] }, { "@type": "BreadcrumbList", name: "keep" }] }),
  });
  const graph = result["@graph"] as Record<string, unknown>[];
  assert.equal(graph.filter(node => node["@type"] === "BlogPosting").length, 1);
  assert.equal(graph.filter(node => node["@type"] === "FAQPage").length, 1);
  assert.equal(graph.find(node => node["@type"] === "BlogPosting")?.headline, "H1");
  assert.ok(graph.some(node => node.name === "keep"));
  const encoded = serializeArticleJsonLd({ text: "</script><script>alert(1)</script>" });
  assert.doesNotMatch(encoded, /</);
  assert.deepEqual(JSON.parse(encoded), { text: "</script><script>alert(1)</script>" });
});


test("FAQ object key order from PostgreSQL does not change the editorial date on a full form save", () => {
  const stored = { ...existing, format: "markdown", content: "## Текст", contentUpdatedAt: then,
    faq: [{ answer: "Ответ", question: "Вопрос?" }, { answer: "Другой ответ", question: "Другой вопрос?" }] };
  const normalizedFaq = readBlogFaq(stored.faq);
  const saved = prepareArticleSave({ title: stored.title, content: stored.content, faq: normalizedFaq, minorEdit: false }, stored, now);
  assert.deepEqual(saved.contentUpdatedAt, then);
  assert.deepEqual(prepareArticleSave({ faq: [...normalizedFaq].reverse() }, stored, now).contentUpdatedAt, now);
  assert.deepEqual(prepareArticleSave({ faq: [{ ...normalizedFaq[0], answer: "Изменённый ответ" }, normalizedFaq[1]] }, stored, now).contentUpdatedAt, now);
});

test("targeted HTML image replacement preserves publication/editorial dates with minorEdit and blocks a broader overwrite", async () => {
  const { replaceArticleImage } = await import('./blog-image-content.ts');
  const old = 'https://example.org/old.webp', newUrl = 'https://example.org/new.webp';
  const row = {...existing, content: existing.content + `<IMG src='${old}' alt='old'>`, readingTimeMinutes:7};
  const change = {url:old,newUrl,alt:'Новая картинка'};
  const content = replaceArticleImage(row.content,change).content;
  const saved = prepareArticleSave({content,minorEdit:true},row,now,change);
  assert.equal(saved.content,content);
  assert.equal(saved.format,'html');
  assert.equal(saved.legacyHtml,null);
  assert.deepEqual(saved.contentUpdatedAt,then);
  assert.deepEqual(saved.publishedAt,then);
  assert.equal(saved.firstPublishedAt,null);
  assert.equal(saved.readingTimeMinutes,7);
  assert.deepEqual(prepareArticleSave({content},row,now,change).contentUpdatedAt,now);
  assert.throws(()=>prepareArticleSave({content:content+'<p>Injected</p>'},row,now,change), /только для чтения/);
});
