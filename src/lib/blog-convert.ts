import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { diffLines } from "diff";
import sanitizeHtml from "sanitize-html";
import { renderArticleBody } from "@/lib/blog-render";

export function normalizeHtmlForDiff(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: false, allowedAttributes: false, allowVulnerableTags: true,
    transformTags: { "*": (tagName, attribs) => ({ tagName, attribs: Object.fromEntries(Object.entries(attribs).sort(([a], [b]) => a.localeCompare(b))) }) },
  }).replace(/>\s+</g, "><").replace(/\s+/g, " ").trim().replace(/></g, ">\n<");
}

export function prepareHtmlConversion(html: string, faq: unknown) {
  const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  converter.use(gfm);
  converter.keep(["figure", "figcaption", "img"]);
  converter.addRule("heading-ids", {
    filter: ["h2", "h3"],
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const id = element.getAttribute("id");
      return `\n\n${element.tagName === "H2" ? "##" : "###"} ${content}${id && /^[a-zA-Z][\w-]*$/.test(id) ? ` {#${id}}` : ""}\n\n`;
    },
  });
  const markdown = converter.turndown(html);
  const before = renderArticleBody(html, "html", faq);
  const after = renderArticleBody(markdown, "markdown", faq);
  return { markdown, before, after, diff: diffLines(normalizeHtmlForDiff(before.html), normalizeHtmlForDiff(after.html)) };
}
