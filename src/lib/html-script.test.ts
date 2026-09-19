import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlAttr, jsonForHtmlScript, pixelRedirectDocument } from "./html-script.ts";

describe("jsonForHtmlScript", () => {
  it("keeps a normal https URL as a JSON string", () => {
    const url = "https://example.com/path?q=1";
    assert.equal(jsonForHtmlScript(url), JSON.stringify(url));
    assert.equal(JSON.parse(jsonForHtmlScript(url)), url);
  });

  it("does not emit a literal </script> that would break an HTML script tag", () => {
    const url = "https://evil.test/</script><script>alert(1)//";
    const literal = jsonForHtmlScript(url);
    const html = `<script>setTimeout(function(){location.replace(${literal});},150);</script>`;
    assert.equal(literal.includes("</script>"), false);
    assert.equal(html.toLowerCase().includes("</script><script>"), false);
    assert.equal(JSON.parse(literal), url);
  });

  it("neutralizes uppercase SCRIPT breakout and ampersands", () => {
    const url = "https://evil.test/</ScRiPt><script>alert(1)&x=1";
    const literal = jsonForHtmlScript(url);
    assert.match(literal, /\\u003c/);
    assert.match(literal, /\\u003e/);
    assert.match(literal, /\\u0026/);
    assert.equal(JSON.parse(literal), url);
  });

  it("shows why JSON.stringify is not safe inside <script>", () => {
    const url = "https://evil.test/</script><script>alert(1)//";
    const naive = `<script>location.replace(${JSON.stringify(url)})</script>`;
    const safe = `<script>location.replace(${jsonForHtmlScript(url)})</script>`;
    assert.equal(naive.toLowerCase().includes("</script><script>"), true);
    assert.equal(safe.toLowerCase().includes("</script><script>"), false);
  });
});

describe("pixelRedirectDocument", () => {
  it("does not let a https URL close the redirect script", () => {
    const url = "https://evil.test/go?next=</script><script>alert(1)//";
    const html = pixelRedirectDocument(url);
    assert.equal(html.toLowerCase().includes("</script><script>alert"), false);
    assert.equal(html.includes("location.replace("), true);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
  });
});

describe("htmlAttr", () => {
  it("escapes quotes and angle brackets for meta refresh", () => {
    const url = `https://evil.test/"></meta><script>alert(1)</script>`;
    const attr = htmlAttr(url);
    assert.equal(attr.includes("<"), false);
    assert.equal(attr.includes(">"), false);
    assert.equal(attr.includes('"'), false);
  });
});
