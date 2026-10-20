import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
import { escapeImageAttribute, blogImageSrcset, type ImageVariant } from "@/lib/blog-image-markup";
import { removeArticleImage, type ArticleImageRemoval } from "@/lib/blog-image-remove";
import { sameBlogImageUrl, blogImageUrlAliases } from "@/lib/blog-media-url";

export type ArticleImageReplacement = { url: string; alt: string; newUrl?: string; variants?: ImageVariant[] };
export type ArticleImageChange = ArticleImageReplacement | ArticleImageRemoval;
export function applyArticleImageChange(content: string, change: ArticleImageChange, format: "html" | "markdown" = "html") {
  return "remove" in change ? removeArticleImage(content, change.url, format) : replaceArticleImage(content, change, format);
}
/** Change only matched image tags/Markdown labels; preserve the rest of the source byte for byte. */
export function replaceArticleImageAlt(
  content: string,
  url: string,
  alt: string,
  format: "html" | "markdown" = "html",
) {
  return replaceArticleImage(content, { url, alt }, format);
}

export function replaceArticleImage(content: string, change: ArticleImageReplacement, format: "html" | "markdown" = "html") {
  const { url, alt, newUrl, variants } = change;
  const codeRanges: { start: number; end: number }[] = [];
  if (format === "markdown") {
    const offsets = [0];
    for (const match of content.matchAll(/\n/g)) offsets.push(match.index! + 1);
    offsets.push(content.length);
    for (const token of new MarkdownIt({ html: true }).parse(content, {}))
      if (["fence", "code_block"].includes(token.type) && token.map)
        codeRanges.push({
          start: offsets[token.map[0]],
          end: offsets[token.map[1]] ?? content.length,
        });
    for (const match of content.matchAll(/(`+)([^`]*?)\1(?!`)/g)) {
      const start = match.index!,
        end = start + match[0].length;
      // Backticks inside HTML tags are ordinary attribute text, not Markdown code.
      if (content.lastIndexOf("<", start) <= content.lastIndexOf(">", start))
        codeRanges.push({ start, end });
    }
  }
  const inCode = (start: number, end: number) =>
    codeRanges.some((range) => start < range.end && end > range.start);
  const dom = new JSDOM(content, { includeNodeLocations: true });
  let found = false;
  const replacements: { start: number; end: number; text: string }[] = [];
  try {
    for (const img of dom.window.document.querySelectorAll("img")) {
      if (!sameBlogImageUrl(img.getAttribute("src"), url) || img.closest("pre, code")) continue;
      const location = dom.nodeLocation(img);
      if (!location) continue;
      if (inCode(location.startOffset, location.endOffset)) continue;
      found = true;
      // Attribute offsets preserve case, quotes, spaces and unrelated attributes exactly.
      const attrs: Record<string, string | null> = { alt };
      if (newUrl !== undefined && newUrl !== url) {
        attrs.src = newUrl;
        const largest = variants?.at(-1);
        Object.assign(attrs, {
          srcset: largest ? blogImageSrcset(variants!) : null,
          sizes: largest ? "(max-width: 960px) 100vw, 960px" : null,
          width: largest ? String(largest.width) : null,
          height: largest ? String(largest.height) : null,
        });
      }
      const insert: string[] = [];
      for (const [name, value] of Object.entries(attrs)) {
        if (img.getAttribute(name) === value) continue;
        const attr = location.attrs?.[name];
        const text = value === null ? "" : `${name}="${escapeImageAttribute(value)}"`;
        if (attr) replacements.push({ start: attr.startOffset, end: attr.endOffset, text });
        else if (value !== null) insert.push(text);
      }
      if (insert.length) {
        const tag = content.slice(location.startOffset, location.endOffset);
        const end = location.endOffset - (tag.endsWith("/>") ? 2 : 1);
        replacements.push({ start: end, end, text: " " + insert.join(" ") });
      }
    }
  } finally {
    dom.window.close();
  }
  const escaped = blogImageUrlAliases(url).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const markdown = new RegExp(
    `!\\[((?:\\\\.|[^\\]\\\\])*)\\](\\(\\s*<?(?:${escaped})>?(?:\\s+["'][^"']*["'])?\\s*\\))`,
    "g",
  );
  for (const match of format === "markdown" ? content.matchAll(markdown) : []) {
    const offset = match.index!,
      end = offset + match[0].length;
    if (
      inCode(offset, end) ||
      replacements.some((r) => offset < r.end && end > r.start)
    )
      continue;
    found = true;
    if (newUrl === undefined && match[1] === alt) continue;
    replacements.push({
      start: offset,
      end,
      text: `![${alt
        .replace(/\\/g, "\\\\")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/[\r\n]/g, " ")}]${newUrl === undefined || newUrl === url ? match[2] : `(<${newUrl.replace(/\(/g, "%28").replace(/\)/g, "%29")}>${match[2].match(/\s+(["'][^"']*["'])\s*\)$/)?.[0].replace(/\)$/, "") ?? ""})`}`,
    });
  }
  let result = content;
  for (const r of replacements.sort((a, b) => b.start - a.start))
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  return { content: result, found };
}
