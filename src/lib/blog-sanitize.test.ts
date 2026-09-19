import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  rewriteWrongBrand,
  sanitizeBlogFields,
  sanitizeBlogHtml,
  sanitizeBlogText,
  stripEditorialMarkers,
} from "@/lib/blog-sanitize";

describe("blog editorial sanitize", () => {
  test("rewrites gr-s.ru links and leftover brand text", () => {
    const html = '<p>Создайте код в <a href="https://gr-s.ru/">gr-s.ru</a> и назовите его Демо-день GR-S.</p>';
    const next = rewriteWrongBrand(html);
    assert.match(next, /https:\/\/qr-s\.ru\//);
    assert.doesNotMatch(next, /gr-s\.ru/i);
    assert.match(next, /Демо-день QR-S/);
  });

  test("does not rewrite image hosts on g-qr.ru", () => {
    const html = '<img src="https://g-qr.ru/uploads/cover.png" alt="обложка"> и текст g-qr.ru';
    const next = rewriteWrongBrand(html);
    assert.match(next, /src="https:\/\/g-qr\.ru\/uploads\/cover\.png"/);
    assert.match(next, /текст qr-s\.ru/);
  });

  test("strips Workflow, CTA and Bxx leftovers", () => {
    const html = [
      "<h2>Workflow</h2>",
      "<p>QR-код на мероприятие (B26)</p>",
      "<blockquote>Workflow: поля встречи → тест</blockquote>",
      "<p>Дальше гайд B26 про регистрацию. CTA</p>",
    ].join("");
    const next = stripEditorialMarkers(html);
    assert.doesNotMatch(next, /Workflow/);
    assert.doesNotMatch(next, /B26/);
    assert.doesNotMatch(next, />CTA</);
    assert.match(next, /QR-код на мероприятие/);
    assert.match(next, /поля встречи/);
  });

  test("calendar article gets an honest product notice", () => {
    const html = "<p>За 15 минут соберёте calendar-QR через ICS на gr-s.ru.</p>";
    const next = sanitizeBlogHtml(html, "qr-kod-dlya-kalendarya");
    assert.match(next, /нет отдельного типа «календарь»/);
    assert.doesNotMatch(next, /gr-s\.ru/i);
    assert.equal(next.includes("Как это сделано в QR-S.ru."), true);
  });

  test("sanitizeBlogFields covers excerpt and meta", () => {
    const next = sanitizeBlogFields({
      slug: "massovaya-generaciya-qr-kodov",
      title: "Массовая генерация в gr-s.ru",
      excerpt: "Сотни кодов. Workflow",
      metaDescription: "ZIP в gr-s.ru (B16)",
      content: "<p>Загрузите CSV в gr-s.ru.</p>",
    });
    assert.equal(next.title, "Массовая генерация в qr-s.ru");
    assert.doesNotMatch(next.excerpt ?? "", /Workflow/);
    assert.doesNotMatch(next.metaDescription ?? "", /B16/);
    assert.match(next.content ?? "", /лимит строк за загрузку/);
  });

  test("plain text helper trims leftover spaces after marker removal", () => {
    assert.equal(sanitizeBlogText("гайд B26 про регистрацию"), "гайд про регистрацию");
  });
});
