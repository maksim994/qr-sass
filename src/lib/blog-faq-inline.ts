// Server-only FAQ policy, shared by the article/preview renderer and JSON-LD.
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const inline = new MarkdownIt("zero", { html: true, breaks: true })
  .enable(["text", "newline", "escape", "entity", "emphasis", "link", "image", "html_inline", "backticks"]);

// Parse unsafe destinations as links too, so their labels survive without Markdown syntax.
// The allowlist below is the only place that can emit an href.
inline.validateLink = () => true;
function safeHref(href: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/u.test(href)) return false;
  let decoded: string;
  try { decoded = decodeURIComponent(href); } catch { return false; }
  if (/[\\\u0000-\u001f\u007f]/u.test(decoded) || decoded.startsWith("//")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (!/^https:\/\//i.test(href)) return false;
  try { return new URL(href).protocol === "https:"; } catch { return false; }
}
inline.renderer.rules.link_open = (tokens, index) => {
  const href = String(tokens[index].attrGet("href") ?? "");
  if (!safeHref(href)) return "";
  const external = !href.startsWith("/") && !["qr-s.ru", "www.qr-s.ru"].includes(new URL(href).hostname);
  return `<a href="${inline.utils.escapeHtml(href)}"${external ? ' rel="noopener nofollow" target="_blank"' : ""}>`;
};
inline.renderer.rules.link_close = (tokens, index) => {
  let depth = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i].type === "link_close") depth++;
    if (tokens[i].type === "link_open" && --depth === 0) return safeHref(String(tokens[i].attrGet("href") ?? "")) ? "</a>" : "";
  }
  return "";
};
inline.renderer.rules.html_inline = () => "";
inline.renderer.rules.image = (tokens, index) => inline.utils.escapeHtml(tokens[index].content);
inline.renderer.rules.code_inline = (tokens, index) => inline.utils.escapeHtml(tokens[index].content);

export function renderFaqAnswer(answer: string): string {
  return sanitizeHtml(inline.renderInline(answer), {
    allowedTags: ["a", "strong", "em", "br"],
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
  });
}

export function faqAnswerText(answer: string): string {
  const text = sanitizeHtml(renderFaqAnswer(answer).replace(/<br\s*\/?>/g, " "), { allowedTags: [], allowedAttributes: {} });
  return inline.utils.unescapeAll(text).replace(/\s+/g, " ").trim();
}
