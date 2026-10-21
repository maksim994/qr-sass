// Dry-run by default. Run --apply only as part of the approved Stage 1 release.
// Uses the versioned Article API with minorEdit; no direct production DB writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replacePrivateArticleLinks } from "../src/lib/blog-public-links.ts";
const origin = process.env.ARTICLE_API_ORIGIN || "https://qr-s.ru";
const token = process.env.ARTICLE_API_TOKEN;

assert.ok(["https://qr-s.ru", "http://127.0.0.1:3010"].includes(origin), "Unexpected API origin");
const apply = process.argv.includes("--apply");
const snapshotPath = process.env.ARTICLE_DRY_RUN_SNAPSHOT;
assert.ok(!(apply && snapshotPath), "A read-only snapshot may never be used with --apply");
assert.ok(snapshotPath || token, "Set ARTICLE_API_TOKEN or ARTICLE_DRY_RUN_SNAPSHOT for a read-only plan");
const snapshot = snapshotPath ? JSON.parse(readFileSync(snapshotPath, "utf8")) : null;
assert.ok(!snapshot || Array.isArray(snapshot), "Article snapshot must be an array");
async function api(path, method = "GET", data) {
  const r = await fetch(origin + "/api/v1/articles" + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json(); assert.ok(r.ok && j.ok, `Article API ${r.status}: ${j.error || "request failed"}`); return j.data;
}
async function article(slug) {
  if (snapshot) return snapshot.find(post => post.slug === slug) ?? null;
  const list = await api(`?slug=${encodeURIComponent(slug)}`);
  return list.items[0] ? api(`/${list.items[0].id}`) : null;
}
const plans = [];
for (const slug of ["primenenie-qr-kodov-v-cafe", "qr-kod-menu-restoran-kafe", "qr-kod-dlya-kalendarya"]) {
  const post = await article(slug);
  if (!post) { console.log(JSON.stringify({ slug, skipped: "not found" })); continue; }
  const patch = {};
  if (post.format === "html") { const content = replacePrivateArticleLinks(post.content); if (content !== post.content) patch.content = content; }
  else {
    // Markdown syntax is intentionally separate from the byte-preserving HTML fix.
    const content = post.content.replace(/\]\((?:https?:\/\/(?:www\.)?qr-s\.ru)?\/dashboard\/(billing|create\/menu|create\/url)\)/g, (_, path) => `](${{ billing: "/pricing", "create/menu": "/qr-menu", "create/url": "/#create-qr" }[path]})`);
    if (content !== post.content) patch.content = content;
  }
  // The root metadata template adds " | qr-s.ru" once to the stored base title.
  if (slug === "qr-kod-dlya-kalendarya") patch.metaTitle = "QR-код для календаря: ссылка на событие";
  if (Object.keys(patch).length) plans.push({ post, patch });
}
const relatedSlugs = ["qr-kod-s-analitikoj-i-korotkoj-ssylkoj", "qr-kod-s-utm-metkami"];
const related = (await Promise.all(relatedSlugs.map(article))).filter(Boolean);
const main = await article("dinamicheskij-i-staticheskij-qr-kod-raznica");
if (main) plans.push({ post: main, patch: { tags: ["динамический qr", "смена ссылки"], relatedArticleIds: related.map(p => p.id) } });
for (const post of related) plans.push({ post, patch: { tags: [...new Set([...(post.tags ?? []), "динамический qr", "смена ссылки"])] } });
for (const { post, patch } of plans) {
  const linkPairs = [["/dashboard/billing", "/pricing"], ["/dashboard/create/menu", "/qr-menu"], ["/dashboard/create/url", "/#create-qr"]];
  const links = patch.content ? linkPairs.flatMap(([from, to]) => {
    const count = post.content.split(from).length - patch.content.split(from).length;
    return count > 0 ? [{ from, to, count }] : [];
  }) : [];
  console.log(JSON.stringify({ slug: post.slug, url: `${origin}/blog/${post.slug}`, mode: apply ? "apply" : "dry-run", source: snapshot ? "read-only-production-snapshot" : "article-api", fields: Object.keys(patch), links,
    ...(patch.metaTitle !== undefined ? { metaTitle: { before: post.metaTitle ?? null, after: patch.metaTitle, renderedTitle: `${patch.metaTitle} | qr-s.ru` } } : {}),
    ...(patch.tags ? { tags: { before: post.tags ?? [], after: patch.tags } } : {}),
    ...(patch.relatedArticleIds ? { relatedArticles: related.map(item => ({ id: item.id, slug: item.slug, title: item.title })) } : {}),
  }));
  if (!apply) continue;
  const after = await api(`/${post.id}`, "PATCH", { ...patch, version: post.version, minorEdit: true, comment: "ТЗ-10 этап 1: публичные CTA, короткий title, тематические связи" });
  for (const field of ["slug", "publishedAt", "firstPublishedAt", "contentUpdatedAt"]) assert.deepEqual(after[field], post[field], `Unexpected ${field} change`);
}
console.log(JSON.stringify({ complete: true, mode: apply ? "applied" : "dry-run", mergedArticles: 0 }));
