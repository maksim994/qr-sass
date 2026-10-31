import assert from "node:assert/strict";
import { test } from "node:test";
import { renderFaqAnswer, faqAnswerText } from "./blog-faq-inline.ts";
import { renderArticleBody } from "./blog-render.ts";
import { buildArticleJsonLd } from "./blog-structured-data.ts";

test("FAQ renders only inline links/emphasis, with distinct internal/external attributes", () => {
  assert.equal(renderFaqAnswer("смотри [тарифы](/pricing)"), 'смотри <a href="/pricing">тарифы</a>');
  assert.equal(renderFaqAnswer("[тарифы](https://qr-s.ru/pricing)"), '<a href="https://qr-s.ru/pricing">тарифы</a>');
  assert.equal(renderFaqAnswer("**жирный** и *курсив*"), "<strong>жирный</strong> и <em>курсив</em>");
  assert.equal(renderFaqAnswer("[сайт](https://example.org/path?q=1&x=2)"), '<a href="https://example.org/path?q=1&amp;x=2" rel="noopener nofollow" target="_blank">сайт</a>');
  const html = renderFaqAnswer('# Заголовок\n![alt](https://example.org/image.png)\n<a href="javascript:alert(1)">HTML</a><img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<(?:h[1-6]|img|script|a)\b|onerror/);
  assert.match(html, /# Заголовок/);
  assert.equal(renderFaqAnswer("`[пример](/pricing)`"), "[пример](/pricing)");
});

test("FAQ strips unsafe link destinations while retaining their labels", () => {
  for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "javascript&#58;alert(1)", "data:text/html,hello", "http://example.org", "mailto:a@example.org", "tel:123", "ftp://example.org", "//example.org", "/%2fevil.test", "/%5cevil.test", "/\\evil.test", "/%0aevil.test", "relative", "#anchor"]) {
    assert.equal(renderFaqAnswer(`[**текст**](${url})`), "<strong>текст</strong>", url);
    assert.equal(faqAnswerText(`[**текст**](${url})`), "текст", url);
  }
  assert.equal(renderFaqAnswer("[поиск](/search?q=two%20words)"), '<a href="/search?q=two%20words">поиск</a>');
});

test("live and preview body renderer agree, and FAQPage contains decoded plain text", () => {
  const answer = "смотри [тарифы](/pricing), **цены** и *условия*\nA &amp; B &#x41;";
  const faq = [{ question: "Вопрос?", answer }];
  for (const format of ["html", "markdown"] as const) {
    const html = renderArticleBody("", format, faq).html;
    assert.match(html, /смотри <a href="\/pricing">тарифы<\/a>, <strong>цены<\/strong> и <em>условия<\/em>/);
  }
  const params = { base: "https://qr-s.ru", articleUrl: "https://qr-s.ru/blog/test", title: "Тест", seoTitle: "Тест", seoDescription: "Тест", coverImageUrl: null, publishedAt: new Date(0), updatedAt: new Date(0), likes: 0, authorName: null };
  for (const input of [{ faq, structuredData: null }, { faq: [], structuredData: JSON.stringify({ "@type": "FAQPage", mainEntity: [{ name: "Вопрос?", acceptedAnswer: { text: answer } }] }) }]) {
    const data = buildArticleJsonLd({ ...params, ...input });
    const node = (data["@graph"] as { "@type": string; mainEntity: { acceptedAnswer: { text: string } }[] }[]).find(item => item["@type"] === "FAQPage")!;
    assert.equal(node.mainEntity[0].acceptedAnswer.text, "смотри тарифы, цены и условия A & B A");
  }
});
