import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
import { LEGACY_BLOG_MEDIA, blogMediaKeyFromUrl } from "@/lib/blog-media-url";
import { escapeImageAttribute } from "@/lib/blog-image-markup";

export function legacyMediaSource(value: string): string | null {
  if (value.startsWith(LEGACY_BLOG_MEDIA)) return value;
  const key = blogMediaKeyFromUrl(value);
  if (!key) return null;
  const url = new URL(value, "https://qr-s.ru");
  return LEGACY_BLOG_MEDIA + key.slice(8) + url.search + url.hash;
}
export function recoveredMediaFilename(oldUrl: string) {
  return createHash("md5").update(oldUrl).digest("hex").slice(0, 10) + ".webp";
}
type Resolver = (url: string) => string | null;
type Edit = { start: number; end: number; text: string };
type Range = { start: number; end: number };
type SourceRange = { startOffset: number; endOffset: number };
type SourceLocation = SourceRange & { startTag?: SourceRange; attrs?: Record<string, SourceRange> };
const md = new MarkdownIt({ html: true });

function migrateSrcset(value: string, resolve: Resolver) {
  const candidates: string[] = [];
  let rest = value, changed = false;
  while (rest) {
    rest = rest.replace(/^[\s,]+/, "");
    const token = /^\S+/.exec(rest)?.[0];
    if (!token) break;
    const url = token.replace(/,+$/, "");
    rest = rest.slice(token.length);
    let descriptor = "";
    if (!token.endsWith(",")) {
      const tail = /^[^,]*(?:,|$)/.exec(rest)?.[0] ?? "";
      descriptor = tail.replace(/,$/, "").trim();
      rest = rest.slice(tail.length);
    }
    const next = resolve(url);
    if (next !== url) changed = true;
    if (next) candidates.push(next + (descriptor ? ` ${descriptor}` : ""));
  }
  return changed ? candidates.join(", ") : value;
}

/** Source offsets preserve article prose, anchors and markup outside the affected images. */
export function migrateBlogMarkup(source: string, format: "html" | "markdown", resolve: Resolver) {
  const edits: Edit[] = [], excluded: Range[] = [], tags: Range[] = [];
  const environment = {};
  if (format === "markdown") {
    const offsets = [0];
    for (const match of source.matchAll(/\n/g)) offsets.push(match.index! + 1);
    for (const token of md.parse(source, environment))
      if (["fence", "code_block"].includes(token.type) && token.map) excluded.push({ start: offsets[token.map[0]], end: offsets[token.map[1]] ?? source.length });
    // Equal backtick runs delimit inline code; tags can themselves contain backticks.
    const ticks = /`+/g;
    let opening;
    while ((opening = ticks.exec(source))) {
      if (source.lastIndexOf("<", opening.index) > source.lastIndexOf(">", opening.index)) continue;
      let closing;
      while ((closing = ticks.exec(source))) if (closing[0].length === opening[0].length) {
        excluded.push({ start: opening.index, end: ticks.lastIndex }); break;
      }
      if (!closing) ticks.lastIndex = opening.index + opening[0].length;
    }
  }
  const overlaps = (start: number, end: number) => excluded.some(r => start < r.end && end > r.start);
  const dom = new JSDOM(source, { includeNodeLocations: true });
  const locationFor = (node: Node) => dom.nodeLocation(node) as SourceLocation | null;
  try {
    const visit = (node: Node) => {
      const location = locationFor(node);
      if (location && (node.nodeType === 8 || /^(PRE|CODE|SCRIPT|STYLE|TEXTAREA)$/.test(node.nodeName))) excluded.push({ start: location.startOffset, end: location.endOffset });
      if (location?.startTag) tags.push({ start: location.startTag.startOffset, end: location.startTag.endOffset });
      for (const child of node.childNodes) visit(child);
    };
    visit(dom.window.document);
    for (const image of Array.from(dom.window.document.querySelectorAll("img, picture source")) as Element[]) {
      const location = locationFor(image);
      if (!location || overlaps(location.startOffset, location.endOffset)) continue;
      const src = image.getAttribute("src");
      const next = src ? resolve(src) : src;
      if (src && next === null && image.tagName === "IMG") {
        let element = image;
        const picture = image.closest("picture");
        if (picture?.querySelectorAll("img").length === 1) element = picture;
        const figure = element.closest("figure");
        if (figure?.querySelectorAll("img, video, audio, iframe, object, embed, svg, canvas").length === 1) element = figure;
        while (element.parentElement && ["A", "P"].includes(element.parentElement.tagName)) {
          const parent: Element = element.parentElement;
          if (!Array.from(parent.childNodes).every(child => child === element || (child.nodeType === 3 && !child.textContent?.trim()))) break;
          element = parent;
        }
        const range = locationFor(element) ?? location;
        edits.push({ start: range.startOffset, end: range.endOffset, text: "" });
        continue;
      }
      for (const attr of ["src", "srcset"] as const) {
        const value = image.getAttribute(attr), range = location.attrs?.[attr];
        if (!value || !range) continue;
        const replacement = attr === "src" ? next : migrateSrcset(value, resolve);
        if (replacement !== value) edits.push({ start: range.startOffset, end: range.endOffset, text: replacement ? `${attr}="${escapeImageAttribute(replacement)}"` : "" });
      }
    }
  } finally { dom.window.close(); }

  if (format === "markdown") for (const match of source.matchAll(/!\[/g)) {
    const start = match.index!;
    let escapes = 0;
    for (let i = start - 1; i >= 0 && source[i] === "\\"; i--) escapes++;
    if (escapes % 2 || overlaps(start, start + 2) || tags.some(r => start >= r.start && start < r.end)) continue;
    let i = start + 2, brackets = 1;
    for (; i < source.length && brackets; i++) {
      if (source[i] === "\\") i++;
      else if (source[i] === "[") brackets++;
      else if (source[i] === "]") brackets--;
    }
    if (brackets) continue;
    if (source[i] === "(") {
      let depth = 1, angle = false, quote = "";
      for (i++; i < source.length && depth; i++) {
        const char = source[i];
        if (char === "\\") { i++; continue; }
        if (quote) { if (char === quote) quote = ""; continue; }
        if (angle) { if (char === ">") angle = false; continue; }
        if ((char === '"' || char === "'") && /\s/.test(source[i - 1])) quote = char;
        else if (char === "<") angle = true;
        else if (char === "(") depth++;
        else if (char === ")") depth--;
      }
      if (depth) continue;
    } else if (source[i] === "[") {
      const end = source.indexOf("]", i + 1);
      if (end === -1) continue;
      i = end + 1;
    }
    if (overlaps(start, i)) continue;
    const tokens = md.parseInline(source.slice(start, i), environment)[0]?.children;
    if (tokens?.length !== 1 || tokens[0].type !== "image") continue;
    const image = tokens[0], old = String(image.attrGet("src") ?? ""), next = resolve(old);
    if (next === old) continue;
    const alt = image.content.replace(/[\\[\]]/g, "\\$&");
    const title = String(image.attrGet("title") ?? "");
    edits.push({ start, end: i, text: next ? `![${alt}](<${next}>${title ? ` "${title.replace(/[\\"]/g, "\\$&")}"` : ""})` : "" });
  }
  // A removed figure/picture owns all nested attribute edits.
  const selected = edits.filter((edit, index) => !edits.some((parent, other) => other !== index && parent.text === "" && parent.start <= edit.start && parent.end >= edit.end && (parent.start < edit.start || parent.end > edit.end)));
  for (const edit of selected.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}

/** Remove unavailable image objects as a whole; retain all non-image JSON-LD values. */
export function migrateMediaJsonLd(value: unknown, resolve: Resolver, imageContext = false): unknown {
  if (typeof value === "string") return imageContext ? resolve(value) : value;
  if (Array.isArray(value)) return value.map(item => migrateMediaJsonLd(item, resolve, imageContext)).filter(item => item !== null);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const isImage = record["@type"] === "ImageObject" || (Array.isArray(record["@type"]) && record["@type"].includes("ImageObject")) || imageContext;
  if (isImage && ["url", "contentUrl", "@id"].some(key => typeof record[key] === "string" && resolve(record[key] as string) === null)) return null;
  return Object.fromEntries(Object.entries(record).flatMap(([key, item]) => {
    const next = migrateMediaJsonLd(item, resolve, ["image", "thumbnailUrl", "contentUrl"].includes(key) || (isImage && ["url", "@id"].includes(key)));
    const imageField = ["image", "thumbnailUrl", "contentUrl"].includes(key) || (isImage && ["url", "@id"].includes(key));
    return next === null && imageField && item !== null ? [] : [[key, next]];
  }));
}

export function migrateArticleMedia<T extends { content?: string; format?: string; renderedHtml?: string | null; legacyHtml?: string | null; coverImageUrl?: string | null; structuredData?: string | null }>(article: T, resolve: Resolver) {
  const next = { ...article };
  if (typeof next.content === "string") next.content = migrateBlogMarkup(next.content, next.format === "markdown" ? "markdown" : "html", resolve);
  for (const field of ["renderedHtml", "legacyHtml"] as const) if (typeof next[field] === "string") next[field] = migrateBlogMarkup(next[field], "html", resolve);
  if (next.coverImageUrl) next.coverImageUrl = resolve(next.coverImageUrl);
  if (next.structuredData) {
    const parsed = JSON.parse(next.structuredData), migrated = migrateMediaJsonLd(parsed, resolve);
    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) next.structuredData = JSON.stringify(migrated);
  }
  return next;
}
