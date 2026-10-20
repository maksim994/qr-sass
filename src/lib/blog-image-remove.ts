import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
import { sameBlogImageUrl } from "@/lib/blog-media-url";

type Range = { start: number; end: number };
export type ArticleImageRemoval = { url: string; remove: true; all?: boolean };

/** srcset URLs may contain commas (e.g. data URLs); descriptors are separate tokens. */
function srcsetContains(srcset: string, target: string) {
  let rest = srcset;
  while (rest) {
    rest = rest.replace(/^[\s,]+/, "");
    const token = /^\S+/.exec(rest)?.[0];
    if (!token) break;
    if (sameBlogImageUrl(token.replace(/,+$/, ""), target)) return true;
    rest = rest.slice(token.length);
    if (!token.endsWith(",")) rest = rest.replace(/^[^,]*(?:,|$)/, "");
  }
  return false;
}

/** Delete source slices only: never serialize a DOM back into the legacy article. */
export function removeArticleImage(content: string, url: string, format: "html" | "markdown" = "html") {
  const md = new MarkdownIt({ html: true });
  const excluded: Range[] = [];
  if (format === "markdown") {
    const offsets = [0];
    for (const match of content.matchAll(/\n/g)) offsets.push(match.index! + 1);
    for (const token of md.parse(content, {})) {
      if (["fence", "code_block"].includes(token.type) && token.map)
        excluded.push({ start: offsets[token.map[0]], end: offsets[token.map[1]] ?? content.length });
    }
    // Match runs of backticks of equal length, including code containing shorter runs.
    const ticks = /`+/g;
    let opening;
    while ((opening = ticks.exec(content))) {
      if (content.lastIndexOf("<", opening.index) > content.lastIndexOf(">", opening.index)) continue;
      let closing;
      while ((closing = ticks.exec(content))) {
        if (closing[0].length === opening[0].length) {
          excluded.push({ start: opening.index, end: ticks.lastIndex });
          break;
        }
      }
      if (!closing) ticks.lastIndex = opening.index + opening[0].length;
    }
  }
  const overlaps = (range: Range) => excluded.some(r => range.start < r.end && range.end > r.start);
  const ranges: Range[] = [];
  const tags: Range[] = [];
  let count = 0;
  const dom = new JSDOM(content, { includeNodeLocations: true });
  try {
    // Do not interpret Markdown images within HTML attributes, comments or literal elements.
    const visit = (node: Node) => {
      const location = dom.nodeLocation(node);
      if (location && (node.nodeType === 8 || (node.nodeType === 1 && /^(PRE|CODE|SCRIPT|STYLE|TEXTAREA)$/.test(node.nodeName))))
        excluded.push({ start: location.startOffset, end: location.endOffset });
      if (location && "startTag" in location && location.startTag)
        tags.push({ start: location.startTag.startOffset, end: location.startTag.endOffset });
      for (const child of node.childNodes) visit(child);
    };
    // HTML tags themselves must not exclude real HTML images, only Markdown scanning below.
    const sourceExcludedCount = excluded.length;
    visit(dom.window.document);
    for (const img of dom.window.document.querySelectorAll("img")) {
      if (img.closest("pre, code, script, style, textarea")) continue;
      if (!sameBlogImageUrl(img.getAttribute("src"), url) && !srcsetContains(img.getAttribute("srcset") ?? "", url)) continue;
      const location = dom.nodeLocation(img);
      if (!location || excluded.slice(0, sourceExcludedCount).some(r => location.startOffset < r.end && location.endOffset > r.start)) continue;
      let element: Element = img;
      const figure = img.closest("figure");
      if (figure && figure.querySelectorAll("img, video, audio, iframe, object, embed, svg, canvas").length === 1 && dom.nodeLocation(figure)?.endTag) {
        element = figure;
      } else {
        while (element.parentElement && ["A", "P"].includes(element.parentElement.tagName)) {
          const parent: Element = element.parentElement;
          const otherwiseEmpty = Array.from(parent.childNodes).every(child => child === element || (child.nodeType === 3 && !child.textContent?.trim()));
          if (!otherwiseEmpty || !dom.nodeLocation(parent)?.endTag) break;
          element = parent;
        }
      }
      const selected = dom.nodeLocation(element)!;
      ranges.push({ start: selected.startOffset, end: selected.endOffset });
      count++;
    }

    if (format === "markdown") {
      for (const match of content.matchAll(/!\[/g)) {
        const start = match.index!;
        let escapes = 0;
        for (let i = start - 1; i >= 0 && content[i] === "\\"; i--) escapes++;
        if (escapes % 2 || overlaps({ start, end: start + 2 }) || tags.some(r => start >= r.start && start < r.end)) continue;
        let i = start + 2, brackets = 1;
        for (; i < content.length && brackets; i++) {
          if (content[i] === "\\") i++;
          else if (content[i] === "[") brackets++;
          else if (content[i] === "]") brackets--;
        }
        if (brackets || content[i] !== "(") continue;
        let depth = 1, quote = "", angle = false;
        for (i++; i < content.length && depth; i++) {
          const char = content[i];
          if (char === "\\") { i++; continue; }
          if (quote) { if (char === quote) quote = ""; continue; }
          if (angle) { if (char === ">") angle = false; continue; }
          if ((char === '"' || char === "'") && /\s/.test(content[i - 1])) quote = char;
          else if (char === "<") angle = true;
          else if (char === "(") depth++;
          else if (char === ")") depth--;
        }
        if (depth) continue;
        const range = { start, end: i };
        if (overlaps(range)) continue;
        const tokens = md.parseInline(content.slice(start, i), {})[0]?.children;
        if (tokens?.length !== 1 || tokens[0].type !== "image" || !sameBlogImageUrl(String(tokens[0].attrGet("src") ?? ""), url)) continue;
        ranges.push(range);
        count++;
      }
    }
  } finally {
    dom.window.close();
  }
  const merged: Range[] = [];
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let result = content;
  for (const range of merged.reverse()) result = result.slice(0, range.start) + result.slice(range.end);
  return { content: result, found: count > 0, count };
}
