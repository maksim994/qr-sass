import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
/** Change only matched image tags/Markdown labels; preserve the rest of the source byte for byte. */
export function replaceArticleImageAlt(
  content: string,
  url: string,
  alt: string,
  format: "html" | "markdown" = "html",
) {
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
  const replacements: { start: number; end: number; text: string }[] = [];
  try {
    for (const img of dom.window.document.querySelectorAll("img")) {
      if (img.getAttribute("src") !== url) continue;
      const location = dom.nodeLocation(img);
      if (!location) continue;
      if (inCode(location.startOffset, location.endOffset)) continue;
      img.setAttribute("alt", alt);
      replacements.push({
        start: location.startOffset,
        end: location.endOffset,
        text: img.outerHTML,
      });
    }
  } finally {
    dom.window.close();
  }
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markdown = new RegExp(
    `!\\[((?:\\\\.|[^\\]\\\\])*)\\](\\(\\s*<?${escaped}>?(?:\\s+["'][^"']*["'])?\\s*\\))`,
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
    replacements.push({
      start: offset,
      end,
      text: `![${alt
        .replace(/\\/g, "\\\\")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/[\r\n]/g, " ")}]${match[2]}`,
    });
  }
  let result = content;
  for (const r of replacements.sort((a, b) => b.start - a.start))
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  return { content: result, found: replacements.length > 0 };
}
