import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { JSDOM } from "jsdom";
import {
  normalizeRedirectPath,
  normalizeRedirectTarget,
  isEditorialRedirectPath,
  assertNoRedirectChain,
} from "./editorial-redirect-input.ts";
import { optimizeBlogImageVariants } from "./image-optimize.ts";
import { blogImageFigure } from "./blog-image-markup.ts";
import { replaceArticleImageAlt } from "./blog-image-content.ts";
import { renderArticleBody, sanitizeArticleHtml } from "./blog-render.ts";
test("redirect normalization preserves external case/query and rejects hidden system paths", () => {
  assert.equal(normalizeRedirectPath("/BLOG/Old//"), "/blog/old");
  assert.equal(
    normalizeRedirectTarget("https://www.qr-s.ru/BLOG/End/?utm=X#H"),
    "/blog/end?utm=X#H",
  );
  assert.equal(
    normalizeRedirectTarget("https://other.example/CaseSensitive?X=Y"),
    "https://other.example/CaseSensitive?X=Y",
  );
  for (const path of [
    "https://evil/",
    "//evil/x",
    "/foo?x=1",
    "/a/../b",
    "/a%5cb",
    "/a%0ab",
    "/a%252fb",
  ])
    assert.throws(() => normalizeRedirectPath(path));
  for (const path of [
    "/api/x",
    "/admin",
    "/R/abc",
    "/p/a",
    "/v/a",
    "/g/a",
    "/_next/x",
    "/robots.txt",
  ])
    assert.equal(
      isEditorialRedirectPath(normalizeRedirectPath(path)),
      false,
      path,
    );
  for (const target of [
    "javascript:alert(1)",
    "//evil.test/x",
    "https://user:pass@evil.test/",
    "/x\\evil",
  ])
    assert.throws(() => normalizeRedirectTarget(target));
});
test("cycles and chains are rejected in both insertion orders with a final-address suggestion", () => {
  assert.throws(() => assertNoRedirectChain("/a", "/a", []), /цикл/);
  assert.throws(
    () => assertNoRedirectChain("/b", "/a", [{ source: "/a", target: "/b" }]),
    /цикл/,
  );
  assert.throws(
    () => assertNoRedirectChain("/a", "/b", [{ source: "/b", target: "/c" }]),
    /\/a → \/c/,
  );
  assert.throws(
    () =>
      assertNoRedirectChain("/b", "https://example.org/end", [
        { source: "/a", target: "/b" },
      ]),
    /\/a → https:\/\/example.org\/end/,
  );
  assert.doesNotThrow(() =>
    assertNoRedirectChain("/x", "/c", [{ source: "/a", target: "/b" }]),
  );
});
test("responsive WebP variants have real dimensions, no enlargement and orientation correction", async () => {
  const buffer = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#526580" },
  })
    .png()
    .toBuffer();
  const variants = await optimizeBlogImageVariants(buffer);
  assert.deepEqual(
    variants.map((v) => v.width),
    [480, 960, 1600],
  );
  for (const variant of variants) {
    const meta = await sharp(variant.buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, variant.width);
    assert.equal(meta.height, variant.height);
    assert.equal(meta.height, meta.width! / 2);
  }
  const oriented = await sharp({
    create: { width: 400, height: 200, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const small = await optimizeBlogImageVariants(oriented);
  assert.equal(small.length, 1);
  assert.equal(small[0].width, 200);
  assert.equal(small[0].height, 400);
});
test("responsive figure survives Markdown sanitization; executable image attributes do not", () => {
  const figure = blogImageFigure({
    url: "https://example.org/a.webp",
    alt: 'Картинка "><script>alert(1)</script>',
    width: 960,
    height: 480,
    variants: [
      { url: "https://example.org/s.webp", key: "s", width: 480, height: 240 },
      { url: "https://example.org/a.webp", key: "a", width: 960, height: 480 },
    ],
  });
  const body = renderArticleBody(figure, "markdown").html;
  assert.match(body, /srcset="https:\/\/example.org\/s.webp 480w/);
  assert.match(body, /width="960" height="480"/);
  assert.ok(!body.includes("<script>"));
  const malicious = sanitizeArticleHtml(
    '<img src="https://example.org/a.webp" srcset="javascript:alert(1) 480w, https://example.org/a.webp 960w" onerror="alert(2)">',
  );
  assert.ok(
    !malicious.includes("javascript:") && !malicious.includes("onerror"),
  );
});
test("alt updates target HTML/Markdown images without rewriting unrelated source", () => {
  const prefix = '<h2 id="Keep">Keep  &amp; spaces</h2>\n',
    suffix = '\n<p data-legacy="yes">Keep suffix</p>';
  const before =
    prefix +
    '<img src="https://example.org/a.webp" alt="Old" width="100">' +
    suffix;
  const after = replaceArticleImageAlt(
    before,
    "https://example.org/a.webp",
    'Новый "alt" <safe>',
  );
  assert.equal(after.found, true);
  assert.ok(after.content.startsWith(prefix) && after.content.endsWith(suffix));
  const dom = new JSDOM(after.content);
  assert.equal(
    dom.window.document.querySelector("img")?.getAttribute("alt"),
    'Новый "alt" <safe>',
  );
  assert.equal(dom.window.document.querySelector("script"), null);
  dom.window.close();
  const md = replaceArticleImageAlt(
    'Before\n\n![Old](https://example.org/a.webp "Title")\n\nAfter',
    "https://example.org/a.webp",
    "Новый [alt]",
    "markdown",
  );
  assert.equal(md.found, true);
  assert.match(
    renderArticleBody(md.content, "markdown").html,
    /alt="Новый \[alt\]"/,
  );
  assert.equal(
    replaceArticleImageAlt(before, "https://example.org/missing.webp", "None")
      .found,
    false,
  );
});
test("alt operation leaves Markdown code examples untouched", () => {
  const url = "https://example.org/a.webp";
  const code =
    '```html\n<img src="' +
    url +
    '" alt="Code">\n```\n\n`![Code](' +
    url +
    ")`\n\n";
  const content = code + "![Real](" + url + ")";
  const patched = replaceArticleImageAlt(
    content,
    url,
    "Новое описание",
    "markdown",
  );
  assert.equal(patched.found, true);
  assert.ok(patched.content.startsWith(code));
  assert.ok(patched.content.endsWith("![Новое описание](" + url + ")"));
});

test("image replacement preserves every unrelated HTML byte and updates responsive sources", async () => {
  const { replaceArticleImage } = await import('./blog-image-content.ts');
  const old = 'https://example.org/old.webp';
  const next = 'https://example.org/new.webp';
  const prefix = '<!--  legacy -->\n<H2 id=Keep data-x="1">Якорь &amp; текст</H2>\n<figure class=inline-quad data-slot=inline_1>';
  const suffix = '</figure>\n<a href="#Keep">Ссылка</a><img src="https://example.org/other.webp" alt=other>\n';
  const before = prefix + `<IMG class='keep' SRC='${old}' ALT='old' srcset='${old} 100w' sizes='100vw' width='100' height='50' loading=lazy />` + suffix;
  const change = { url: old, newUrl: next, alt: 'Новая "картинка" <ok>', variants: [{ url: next, key: 'x', width: 960, height: 480 }] };
  const patched = replaceArticleImage(before, change);
  assert.ok(patched.found);
  assert.ok(patched.content.startsWith(prefix) && patched.content.endsWith(suffix));
  assert.ok(patched.content.includes("<IMG class='keep' "));
  assert.ok(patched.content.includes('loading=lazy />'));
  const dom = new JSDOM(patched.content);
  const img = dom.window.document.querySelector('img')!;
  assert.equal(img.getAttribute('src'), next);
  assert.equal(img.getAttribute('alt'), change.alt);
  assert.equal(img.getAttribute('srcset'), `${next} 960w`);
  assert.equal(img.getAttribute('width'), '960');
  dom.window.close();
  const external = replaceArticleImage(before, { url: old, newUrl: next, alt: 'External' }).content;
  assert.doesNotMatch(external, /srcset=|sizes=|width=|height=/);
  assert.ok(external.startsWith(prefix) && external.endsWith(suffix));
});
test("image replacement no-op stays byte-identical and never changes HTML code or similar URLs", async () => {
  const { replaceArticleImage } = await import('./blog-image-content.ts');
  const url = 'https://example.org/a.webp?x=1&y=2';
  const source = `<IMG src='https://example.org/a.webp?x=1&amp;y=2' alt='Same' />`;
  assert.deepEqual(replaceArticleImage(source, {url, alt:'Same', newUrl:url}), {content:source, found:true});
  const excluded = `<pre><img src="${url}" alt="code"></pre><img src="${url}0" alt="similar"><!-- <img src="${url}"> -->`;
  assert.deepEqual(replaceArticleImage(excluded, {url, alt:'new', newUrl:'https://example.org/new.webp'}), {content:excluded, found:false});
});
test("Markdown replacement preserves title and code; new URLs cannot break destination syntax", async () => {
  const { replaceArticleImage } = await import('./blog-image-content.ts');
  const url = 'https://example.org/a.webp';
  const code = `\`![Code](${url})\`\n\n\`\`\`md\n![Code](${url})\n\`\`\`\n\n`;
  const result = replaceArticleImage(code + `![Old](${url} "Title")`, {url, newUrl:'https://example.org/new(1).webp?x=1&y=2', alt:'[Новый]'}, 'markdown');
  assert.ok(result.content.startsWith(code));
  const rendered = renderArticleBody(result.content, 'markdown').html;
  assert.match(rendered, /src="https:\/\/example.org\/new%281%29.webp\?x=1&amp;y=2"/);
  assert.match(result.content, /"Title"\)/);
  assert.match(rendered, /alt="\[Новый\]"/);
});
