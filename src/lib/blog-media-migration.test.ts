import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { migrateBlogMarkup, migrateArticleMedia, recoveredMediaFilename, legacyMediaSource } from "./blog-media-migration.ts";
import { renderArticleBody } from "./blog-render.ts";

const old = "https://s3.mvmolkov.ru/qr/blog/content/a.webp", missing = "https://s3.mvmolkov.ru/qr/blog/covers/missing.webp";
const next = `https://qr-s.ru/media/blog/content/${recoveredMediaFilename(old)}`;
const replace = (url: string) => url === old ? next : url === missing ? null : url;
test("recovery filenames hash the exact old URL and reject unrelated origins", () => {
  assert.equal(recoveredMediaFilename(old), createHash("md5").update(old).digest("hex").slice(0, 10) + ".webp");
  assert.notEqual(recoveredMediaFilename(old), recoveredMediaFilename(old + "?v=1"));
  assert.equal(legacyMediaSource("https://qr-s.ru/media/blog/content/a.webp"), old);
  for (const url of ["https://s3.mvmolkov.ru.evil/qr/blog/content/a.webp", "https://s3.mvmolkov.ru/qr/private/a.webp", "https://elsewhere.example/a.webp"]) assert.equal(legacyMediaSource(url), null);
});
test("migration preserves prose/anchors/alt, rewrites images and prunes unavailable srcset variants", () => {
  const source = `<h2 id="keep">Раздел</h2><p>${old} <a href="${old}">ссылка</a></p>\n<img alt='описание' src='${old}' width="960" height="540" srcset="${missing} 400w, ${old} 960w">`;
  const migrated = migrateBlogMarkup(source, "html", replace);
  assert.equal(migrated, source.replace(`src='${old}'`, `src="${next}"`).replace(`${missing} 400w, ${old} 960w`, `${next} 960w`));
  assert.equal(migrateBlogMarkup(migrated, "html", replace), migrated);
  assert.equal(migrateBlogMarkup(`<figure><picture><source srcset="${missing} 500w"><img src="${missing}"></picture><figcaption>Caption</figcaption></figure><p>Keep</p>`, "html", replace), "<p>Keep</p>");
  assert.equal(migrateBlogMarkup(`<p><a href="${missing}"><img src="${missing}"></a></p>`, "html", replace), "");
  assert.equal(migrateBlogMarkup(`<figure><img src="${missing}"><img src="${old}"></figure>`, "html", replace), `<figure><img src="${next}"></figure>`);
  const unrelated = '<img src="https://example.org/a.webp" srcset="https://example.org/a.webp   500w,https://example.org/b.webp  900w">';
  assert.equal(migrateBlogMarkup(unrelated, "html", replace), unrelated);
  assert.equal(migrateBlogMarkup(`<img src="${old}" srcset="data:image/png;base64,AAAA 1x, ${old} 2x">`, "html", replace), `<img src="${next}" srcset="data:image/png;base64,AAAA 1x, ${next} 2x">`);
});
test("Markdown inline/reference images migrate or disappear, while code and ordinary links survive", () => {
  const source = `## Заголовок\n\n![Описание](${old} "title")\n![Missing](${missing})\n![Ref][ref]\n![Lost][lost]\n![ref]\n\n[ref]: ${old}\n[lost]: ${missing}\n\n[link](${old})\n\n\`![code](${missing})\`\n\n\`\`\`md\n![code](${old})\n\`\`\`\n`;
  const migrated = migrateBlogMarkup(source, "markdown", replace);
  const rendered = renderArticleBody(migrated, "markdown").html;
  assert.equal((rendered.match(/<img /g) ?? []).length, 3);
  assert.equal((rendered.match(new RegExp(`src="${next}"`, "g")) ?? []).length, 3);
  assert.ok(migrated.includes(`[link](${old})`));
  assert.ok(migrated.includes(`\`![code](${missing})\``));
  assert.ok(migrated.includes(`![code](${old})\n\`\`\``));
  assert.equal(migrateBlogMarkup(migrated, "markdown", replace), migrated);
});
test("covers, caches, legacy HTML and image JSON-LD migrate without changing dates/non-image data", () => {
  const source = { content: `<img src="${old}">`, renderedHtml: `<img src="${missing}">`, legacyHtml: `<img src="${old}">`, coverImageUrl: missing, format: "html", structuredData: JSON.stringify({ image: [{ "@type": "ImageObject", url: missing, width: 100 }, old], description: old, dateModified: "2025-01-01", other: null }, null, 2) };
  const migrated = migrateArticleMedia(source, replace);
  assert.equal(migrated.coverImageUrl, null); assert.equal(migrated.renderedHtml, "");
  assert.equal(migrated.legacyHtml, `<img src="${next}">`);
  assert.deepEqual(JSON.parse(migrated.structuredData!), { image: [next], description: old, dateModified: "2025-01-01", other: null });
  assert.deepEqual(migrateArticleMedia(migrated, replace), migrated);
  const untouched = { content: "Проза", structuredData: '{\n "description": "Test", "other": null\n}' };
  assert.deepEqual(migrateArticleMedia(untouched, replace), untouched);
});
