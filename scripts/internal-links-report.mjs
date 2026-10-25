// Pure reporting functions. No DB client, HTTP mutations or apply mode.
import { JSDOM } from "jsdom";
import { createHash } from "node:crypto";
import MarkdownIt from "markdown-it";
const md = new MarkdownIt({ html: true });

export function internalPath(href, source = "/") {
  try {
    const url = new URL(href, `https://qr-s.ru${source}`);
    if (!["http:", "https:"].includes(url.protocol) || !["qr-s.ru", "www.qr-s.ru"].includes(url.hostname)) return null;
    return decodeURI(url.pathname).replace(/\/+$/, "") || "/";
  } catch { return null; }
}

export function redirectMap(snapshot, staticRedirects) {
  return new Map([
    ...Object.entries(staticRedirects).map(([source, target]) => [`/blog/${source}`, `/blog/${target}`]),
    ...(snapshot.redirects ?? []).map(({ source, target }) => [internalPath(source), target]).filter(([source]) => source),
  ]);
}

export function validateSnapshot(snapshot) {
  if (!Array.isArray(snapshot.posts) || !(Array.isArray(snapshot.redirects) || snapshot.redirects === null)) throw new Error("Snapshot must contain posts and redirects arrays; null explicitly means the redirect table was not exported.");
  for (const post of snapshot.posts) {
    if (!post.id || !post.slug || typeof post.content !== "string" || !Array.isArray(post.relatedArticleIds) || !["html", "markdown"].includes(post.format)) throw new Error("Each post requires id, slug, content, format and relatedArticleIds.");
  }
  if (new Set(snapshot.posts.map(p => p.id)).size !== snapshot.posts.length || new Set(snapshot.posts.map(p => p.slug)).size !== snapshot.posts.length) throw new Error("Duplicate article IDs or slugs.");
  for (const row of snapshot.redirects ?? []) if (typeof row.source !== "string" || typeof row.target !== "string") throw new Error("Each redirect requires source and target.");
}

export function auditRedirects(snapshot, staticRedirects) {
  validateSnapshot(snapshot);
  const redirects = redirectMap(snapshot, staticRedirects);
  const byId = new Map(snapshot.posts.map(p => [p.id, p]));
  const links = [], related = [], unknownRelatedIds = [];
  for (const post of snapshot.posts) {
    const html = post.format === "markdown" ? md.render(post.content) : post.content;
    const dom = new JSDOM(html);
    for (const a of dom.window.document.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      const path = internalPath(href, `/blog/${post.slug}`);
      if (redirects.has(path)) links.push({ slug: post.slug, href, anchor: a.textContent, target: redirects.get(path) });
    }
    dom.window.close();
    for (const id of post.relatedArticleIds) {
      const target = byId.get(id);
      if (!target) unknownRelatedIds.push({ slug: post.slug, id });
      else if (redirects.has(`/blog/${target.slug}`)) related.push({ slug: post.slug, id, redirectedSlug: target.slug, target: redirects.get(`/blog/${target.slug}`) });
    }
  }
  return { mode: "report-only", redirectTableIncluded: snapshot.redirects !== null, articles: snapshot.posts.length, links, related, unknownRelatedIds };
}

export function planRelated(snapshot, plan, staticRedirects) {
  validateSnapshot(snapshot);
  if (plan.schemaVersion !== 1 || !Array.isArray(plan.targets)) throw new Error("Unsupported related plan.");
  const redirects = redirectMap(snapshot, staticRedirects);
  const bySlug = new Map(snapshot.posts.map(p => [p.slug, p]));
  const byId = new Map(snapshot.posts.map(p => [p.id, p]));
  const changes = new Map(), blockers = [], deferred = [];
  for (const entry of plan.targets) {
    for (const source of entry.deferredSources ?? []) deferred.push({ source, target: entry.target, reason: "outside-current-link-budget" });
    const target = bySlug.get(entry.target);
    for (const source of entry.sources) {
      const post = bySlug.get(source);
      if (!post || !target || !post.publishedAt || !target.publishedAt || redirects.has(`/blog/${source}`) || redirects.has(`/blog/${entry.target}`) || post.id === target.id) {
        blockers.push({ source, target: entry.target, reason: "missing, unpublished, redirected or self-linked article" }); continue;
      }
      const current = changes.get(post.id)?.after ?? post.relatedArticleIds;
      const after = [target.id, ...current.filter(id => id !== target.id)];
      changes.set(post.id, { id: post.id, slug: source, version: post.version ?? null, updatedAt: post.updatedAt ?? null, before: post.relatedArticleIds, after });
    }
  }
  const diff = [...changes.values()].filter(row => JSON.stringify(row.before) !== JSON.stringify(row.after)).map(row => ({
    ...row, beforeSlugs: row.before.map(id => byId.get(id)?.slug ?? `UNKNOWN:${id}`), afterSlugs: row.after.map(id => byId.get(id)?.slug ?? `UNKNOWN:${id}`),
  }));
  return { mode: "dry-run", redirectTableIncluded: snapshot.redirects !== null, diff, blockers, deferred, applied: false };
}

export function verifyContentPlan(posts, plan) {
  if (!Array.isArray(posts) || !Array.isArray(plan.changes)) throw new Error("Expected article array and content plan.");
  const hash = s => createHash("sha256").update(s).digest("hex");
  const groups = new Map();
  for (const change of plan.changes) {
    const post = posts.find(p => p.id === change.articleId && p.slug === change.slug);
    if (!post || post.format !== change.format || post.version !== change.sourceVersion || post.updatedAt !== change.sourceUpdatedAt || hash(post.content) !== change.sourceContentSha256) throw new Error(`Source changed or missing: ${change.slug}`);
    if (!change.before || change.before === change.after || post.content.split(change.before).length !== 2 || post.content.slice(change.sourceOffset, change.sourceOffset + change.before.length) !== change.before) throw new Error(`Source fragment is ambiguous or changed: ${change.slug}`);
    const group = groups.get(post.id) ?? { post, fragments: [] };
    group.fragments.push(change);
    groups.set(post.id, group);
  }
  const reports = [];
  for (const { post, fragments } of groups.values()) {
    let after = post.content, previous = after.length + 1;
    for (const change of fragments.sort((a, b) => b.sourceOffset - a.sourceOffset)) {
      if (change.sourceOffset + change.before.length > previous) throw new Error(`Overlapping fragments: ${post.slug}`);
      after = after.slice(0, change.sourceOffset) + change.after + after.slice(change.sourceOffset + change.before.length);
      previous = change.sourceOffset;
    }
    const counts = raw => {
      const dom = new JSDOM(post.format === "markdown" ? md.render(raw) : raw);
      const result = new Map();
      for (const a of dom.window.document.querySelectorAll("a[href]")) {
        const path = internalPath(a.getAttribute("href"), `/blog/${post.slug}`);
        if (path) result.set(path, (result.get(path) ?? 0) + 1);
      }
      dom.window.close();
      return result;
    };
    const beforeCounts = counts(post.content), afterCounts = counts(after), expected = new Map();
    for (const change of fragments) for (const target of change.targets) expected.set(target.target, (expected.get(target.target) ?? 0) + target.newLinks);
    for (const [target, count] of expected) if ((afterCounts.get(target) ?? 0) - (beforeCounts.get(target) ?? 0) !== count) throw new Error(`Unexpected link delta: ${post.slug} → ${target}`);
    for (const [target, count] of afterCounts) if (count > (beforeCounts.get(target) ?? 0) && !expected.has(target)) throw new Error(`Unplanned link: ${post.slug} → ${target}`);
    reports.push({ id: post.id, slug: post.slug, format: post.format, version: post.version, beforeSha256: hash(post.content), afterSha256: hash(after), fragments: fragments.length, newLinks: Object.fromEntries(expected) });
  }
  return { mode: "verification-only", applied: false, proposals: plan.changes.length, articles: groups.size, reports };
}
