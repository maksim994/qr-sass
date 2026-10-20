// Server renderer. Import only from server pages, handlers and tests.
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import sanitizeHtml from "sanitize-html";
import DOMPurify from "isomorphic-dompurify";
import { readBlogFaq, type BlogFaq } from "@/lib/blog-faq";

export type ArticleBody = { html: string; items: { id: string; text: string }[] };
export type ArticleFormat = "html" | "markdown";
const md = new MarkdownIt({ html: true, linkify: true, breaks: false }).use(taskLists);
const escape = md.utils.escapeHtml;
const TABLE_START = '<div class="qrs-article-table-scroll" role="region" aria-label="Таблица с горизонтальной прокруткой" tabindex="0">';

const rawPolicy: sanitizeHtml.IOptions = {
  allowedTags: ["figure", "img", "figcaption"],
  allowedAttributes: {
    figure: ["class", "data-slot"],
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false,
};

function rawHtml(raw: string): string {
  let clean = sanitizeHtml(raw, rawPolicy);
  // Inline open tags are paired by the parser; keep pairing with the user's closing token.
  if (/^<(figure|figcaption)\b[^>]*>$/i.test(raw)) clean = clean.replace(/<\/(figure|figcaption)>$/, "");
  if (/^<\/(figure|figcaption)>$/i.test(raw)) clean = raw.toLowerCase();
  return clean;
}
md.renderer.rules.html_block = (tokens, index) => rawHtml(tokens[index].content);
md.renderer.rules.html_inline = (tokens, index) => rawHtml(tokens[index].content);
md.renderer.rules.task_checkbox = (tokens, index) => tokens[index].content;
// Recognize only the first token inserted by the task-list rule, never arbitrary raw HTML.
md.core.ruler.after("github-task-lists", "safe-task-checkboxes", (state) => {
  for (let index = 2; index < state.tokens.length; index++) {
    const inline = state.tokens[index];
    if (inline.type === "inline" && state.tokens[index - 2].attrGet("class") === "task-list-item") {
      const checkbox = inline.children?.[0];
      if (checkbox?.type === "html_inline" && checkbox.content.startsWith('<input class="task-list-item-checkbox"')) checkbox.type = "task_checkbox";
    }
  }
});

/** Explicit whitelist for generated HTML; never pass raw input straight to the browser. */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "ul", "ol", "li", "blockquote", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "input"],
    allowedAttributes: {
      h2: ["id"], h3: ["id"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      figure: ["class", "data-slot"],
      ol: ["start"], th: ["align"], td: ["align"],
      input: ["type", "checked", "disabled"],
      ul: ["class"], li: ["class"],
    },
    allowedClasses: { figure: ["inline-quad"], ul: ["contains-task-list"], li: ["task-list-item"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_name, attributes) => {
        const attrs = { ...attributes };
        delete attrs.target;
        delete attrs.rel;
        try {
          const url = new URL(attrs.href, "https://qr-s.ru");
          if (["http:", "https:"].includes(url.protocol) && !["qr-s.ru", "www.qr-s.ru"].includes(url.hostname)) {
            attrs.target = "_blank";
            attrs.rel = "noopener";
          }
        } catch { /* sanitizer removes invalid schemes */ }
        return { tagName: "a", attribs: attrs };
      },
      input: (_name, attributes) => ({ tagName: "input", attribs: { type: "checkbox", disabled: "", ...(Object.hasOwn(attributes, "checked") ? { checked: "" } : {}) } }),
    },
    exclusiveFilter: (frame) => (
      frame.tag === "img" && !frame.attribs.src
    ) || (
      frame.tag === "figure" && /^inline_[123]$/.test(frame.attribs["data-slot"] ?? "") && !frame.mediaChildren?.includes("img")
    ),
  });
}

const transliteration: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};
export function articleHeadingSlug(text: string): string {
  return [...text.toLowerCase()].map(char => transliteration[char] ?? char).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

function faqHtml(faq: BlogFaq): string {
  if (!faq.length) return "";
  return `<h2 id="faq">Частые вопросы</h2>${faq.map((item) => `<h3>${escape(item.question)}</h3><p>${escape(item.answer).replace(/\n/g, "<br>")}</p>`).join("")}`;
}

function placeFaq(html: string, faq: BlogFaq): string {
  const block = faqHtml(faq);
  let placed = false;
  const withMarker = html.replace(/<p>\s*\[\[faq\]\]\s*<\/p>/g, () => {
    if (placed) return "";
    placed = true;
    return block;
  });
  if (placed || !faq.length) return withMarker;
  // Explicit field import replaces the visible legacy FAQ, keeping its source intact in the DB.
  const oldFaq = /<h2\b[^>]*>\s*(?:Частые вопросы|FAQ)\s*<\/h2>[\s\S]*?(?=<h2\b|$)/i;
  return oldFaq.test(withMarker) ? withMarker.replace(oldFaq, () => block) : withMarker + block;
}

function wrapTables(html: string): string {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, table => `${TABLE_START}${table}</div>`);
}

// Keep this policy and slug algorithm identical to the pre-TZ-06 legacy renderer.
export function renderLegacyBody(content: string): ArticleBody {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["h1","h2","h3","h4","h5","h6","p","br","hr","strong","b","em","i","u","s","code","pre","ul","ol","li","blockquote","a","img","table","thead","tbody","tr","th","td"],
    ALLOWED_ATTR: ["href","src","alt","title","target","rel"],
  });
  const items: ArticleBody["items"] = [];
  const usedIds = new Set<string>();
  const html = wrapTables(sanitized).replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_full, attrs = "", inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "") || `section-${items.length}`;
    if (usedIds.has(id)) {
      let n = 1;
      while (usedIds.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    usedIds.add(id);
    items.push({ id, text });
    const cleanedAttrs = String(attrs).replace(/\s+id=(["']).*?\1/i, "");
    return `<h2${cleanedAttrs} id="${id}">${inner}</h2>`;
  });
  return { html, items };
}

export function renderArticleBody(content: string, format: ArticleFormat, faqValue: unknown = []): ArticleBody {
  const faq = readBlogFaq(faqValue);
  if (format === "html") {
    const legacy = renderLegacyBody(content);
    if (!faq.length) return legacy;
    const html = placeFaq(legacy.html, faq);
    const items = [...html.matchAll(/<h2\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi)]
      .map(match => ({ id: match[1], text: match[2].replace(/<[^>]+>/g, "") }));
    return { html, items };
  }
  const tokens = md.parse(content, {});
  const used = new Set<string>(faq.length ? ["faq"] : []);
  const explicit = new Set(tokens.filter(t => t.type === "inline").map(t => t.content.match(/\s+\{#([a-zA-Z][\w-]*)\}\s*$/)?.[1]).filter(Boolean));
  const items: ArticleBody["items"] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "heading_open" || !["h2", "h3"].includes(token.tag)) continue;
    const inline = tokens[index + 1];
    const match = inline.content.match(/\s+\{#([a-zA-Z][\w-]*)\}\s*$/);
    if (match) {
      inline.content = inline.content.slice(0, match.index);
      const last = inline.children?.at(-1);
      if (last?.type === "text") last.content = last.content.replace(/\s+\{#[a-zA-Z][\w-]*\}\s*$/, "");
    }
    const text = md.utils.unescapeAll(sanitizeHtml(md.renderer.renderInline(inline.children ?? [], md.options, {}), { allowedTags: [], allowedAttributes: {} }));
    const base = match?.[1] ?? articleHeadingSlug(text);
    let id = base, suffix = 2;
    while (used.has(id) || (!match && explicit.has(id))) id = `${base}-${suffix++}`;
    used.add(id);
    token.attrSet("id", id);
    items.push({ id, text });
  }
  let html = sanitizeArticleHtml(md.renderer.render(tokens, md.options, {}));
  html = placeFaq(html, faq);
  const finalItems = [...html.matchAll(/<h[23]\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi)]
    .map(match => ({ id: match[1], text: md.utils.unescapeAll(sanitizeHtml(match[2], { allowedTags: [], allowedAttributes: {} })) }));
  return { html: wrapTables(html), items: finalItems };
}
