import { extractLegacyFaq, readBlogFaq } from "@/lib/blog-faq";
import { faqAnswerText } from "@/lib/blog-faq-inline";
import { blogMediaUrl } from "@/lib/blog-media-url";
import { rewriteBlogMediaJsonLd } from "@/lib/blog-media-html";

/** Форматирует JSON-LD для формы, сохраняя повреждённые данные для исправления. */
export function formatStructuredDataForEdit(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** Нормализует structuredData из API: объект или JSON-строка → строка для БД */
export function normalizeStructuredDataInput(
  value: unknown,
): { ok: true; data: string } | { ok: false; error: string } {
  if (value == null) return { ok: true, data: "" };

  let parsed: unknown;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, data: "" };
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { ok: false, error: "structuredData должен быть валидным JSON" };
    }
  } else if (typeof value === "object") {
    parsed = value;
  } else {
    return { ok: false, error: "structuredData должен быть объектом или JSON-строкой" };
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    return { ok: false, error: "structuredData должен быть JSON-объектом" };
  }

  return { ok: true, data: JSON.stringify(parsed) };
}

/** Парсит structuredData из БД для вывода на странице */
export function parseStructuredDataForPage(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // некорректные данные — fallback на автогенерацию
  }
  return null;
}

type DefaultArticleJsonLdParams = {
  base: string;
  articleUrl: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  coverImageUrl: string | null;
  coverImageWidth?: number;
  coverImageHeight?: number;
  publishedAt: Date;
  updatedAt: Date;
  likes: number;
  authorName: string | null;
};

export function buildDefaultArticleJsonLd(params: DefaultArticleJsonLdParams): Record<string, unknown> {
  const {
    base,
    articleUrl,
    title,
    seoTitle,
    seoDescription,
    coverImageUrl,
    publishedAt,
    updatedAt,
    likes,
    authorName,
  } = params;

  const articleId = `${articleUrl}#article`;
  const webpageId = `${articleUrl}#webpage`;

  const author = authorName?.trim()
    ? { "@type": "Person", name: authorName.trim() }
    : { "@type": "Organization", name: "qr-s.ru", url: base };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: articleUrl,
        name: seoTitle,
        description: seoDescription,
        mainEntity: { "@id": articleId },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Главная", item: base },
            { "@type": "ListItem", position: 2, name: "Блог", item: `${base}/blog` },
            { "@type": "ListItem", position: 3, name: title, item: articleUrl },
          ],
        },
      },
      {
        "@type": "Article",
        "@id": articleId,
        headline: title,
        description: seoDescription,
        image: coverImageUrl ? { "@type": "ImageObject", url: blogMediaUrl(coverImageUrl), ...(params.coverImageWidth && params.coverImageHeight ? { width: params.coverImageWidth, height: params.coverImageHeight } : {}) } : undefined,
        datePublished: publishedAt.toISOString(),
        dateModified: updatedAt.toISOString(),
        url: articleUrl,
        mainEntityOfPage: { "@id": webpageId },
        author,
        publisher: { "@type": "Organization", name: "qr-s.ru", url: base },
        ...(likes > 0 && {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: likes,
          },
        }),
      },
    ],
  };
}

/** Field-owned types take priority even inside nested @graph/arrays or multi-type nodes. */
function withoutOwnedTypes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutOwnedTypes).filter(item => item !== undefined);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.some(type => ["Article", "BlogPosting", "FAQPage"].includes(String(type)))) return undefined;
  return Object.fromEntries(Object.entries(record).flatMap(([key, item]) => {
    const clean = withoutOwnedTypes(item);
    return clean === undefined ? [] : [[key, clean]];
  }));
}

export function buildArticleJsonLd(params: DefaultArticleJsonLdParams & { faq: unknown; structuredData: string | null }): Record<string, unknown> {
  const generated = buildDefaultArticleJsonLd(params);
  const graph = generated["@graph"] as Record<string, unknown>[];
  const article = graph.find(node => node["@type"] === "Article")!;
  article["@type"] = "BlogPosting";
  article.author = { "@type": "Person", name: params.authorName?.trim() || "Мольков Максим", url: "https://mvmolkov.ru/" };
  const fieldFaq = readBlogFaq(params.faq);
  // Compatibility until the administrator explicitly imports legacy questions into fields.
  const faq = fieldFaq.length ? fieldFaq : extractLegacyFaq(params.structuredData);
  if (faq.length) graph.push({
    "@type": "FAQPage", "@id": `${params.articleUrl}#faq`,
    mainEntity: faq.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: faqAnswerText(item.answer) } })),
  });
  const custom = withoutOwnedTypes(parseStructuredDataForPage(params.structuredData)) as Record<string, unknown> | undefined;
  if (custom) {
    if (Array.isArray(custom["@graph"])) graph.push(...custom["@graph"] as Record<string, unknown>[]);
    else if (custom["@type"]) graph.push(custom);
  }
  return rewriteBlogMediaJsonLd(generated) as Record<string, unknown>;
}

export function serializeArticleJsonLd(value: unknown): string {
  // Prevent a JSON string containing </script> from closing the JSON-LD element.
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
