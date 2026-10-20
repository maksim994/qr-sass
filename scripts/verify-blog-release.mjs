// Read-only release baseline/compare. Output contains private drafts; keep outside Git, mode 0600.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { getDb } from "../src/lib/db.ts";

const db = getDb();
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const origin = (process.env.BLOG_VERIFY_ORIGIN || process.env.APP_URL).replace(/\/+$/, "");
const oldFields = ["id", "slug", "title", "metaTitle", "metaDescription", "excerpt", "content", "coverImageUrl", "authorName", "structuredData", "readingTimeMinutes", "publishedAt", "createdAt", "createdById", "categoryId"];
try {
  const rows = await db.blogPost.findMany({ orderBy: { slug: "asc" } });
  const records = Object.fromEntries(rows.map(row => [row.id, hash(Object.fromEntries(oldFields.map(key => [key, row[key]])))]));
  const published = rows.filter(row => row.publishedAt);
  const chosen = [...published.filter(row => row.slug === "razmer-qr-koda-dlya-pechati"), ...published.filter(row => /figure[^>]*inline-quad/.test(row.content)), ...published];
  const pages = {};
  for (const row of chosen) {
    if (Object.keys(pages).length === 5) break;
    if (pages[row.slug]) continue;
    const response = await fetch(`${origin}/blog/${row.slug}`, { redirect: "manual", headers: { "User-Agent": "QR-S-release-check-bot" }, signal: AbortSignal.timeout(30000) });
    if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); continue; }
    if (!response.ok) throw new Error(`Article HTTP ${response.status}: ${row.slug}`);
    const document = new JSDOM(await response.text()).window.document;
    const body = document.querySelector(".qrs-body");
    if (!body) throw new Error(`No body: ${row.slug}`);
    pages[row.slug] = { body: body.innerHTML, sourceHash: hash(row.content), hasInlineFigure: /figure[^>]*inline-quad/.test(row.content) };
  }
  if (Object.keys(pages).length !== 5) throw new Error("Five public articles required");
  const sitemapResponse = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
  if (!sitemapResponse.ok) throw new Error("Sitemap unavailable");
  const sitemap = new JSDOM(await sitemapResponse.text(), { contentType: "text/xml" }).window.document;
  const urls = [...sitemap.querySelectorAll("loc")].map(node => new URL(node.textContent).pathname).sort();
  if (process.argv[2] === "--compare") {
    const before = JSON.parse(await readFile(process.argv[3], "utf8"));
    const failures = [];
    for (const [id, old] of Object.entries(before.records)) if (records[id] !== old) failures.push(`article:${id}`);
    for (const [slug, page] of Object.entries(before.pages)) {
      const current = pages[slug];
      if (!current || current.body !== page.body || current.sourceHash !== page.sourceHash) failures.push(`html:${slug}`);
    }
    for (const url of before.urls) if (!urls.includes(url)) failures.push(`sitemap:${url}`);
    if (rows.some(row => row.format !== undefined && row.format !== "html")) failures.push("unexpected-conversion");
    console.log(JSON.stringify({ ok: !failures.length, articleRecords: rows.length, htmlCompared: Object.keys(before.pages).length, figureArticles: Object.values(before.pages).filter(page => page.hasInlineFigure).length, sitemapUrls: urls.length, failures }));
    if (failures.length) process.exitCode = 1;
  } else console.log(JSON.stringify({ records, pages, urls }));
} finally { await db.$disconnect(); }
