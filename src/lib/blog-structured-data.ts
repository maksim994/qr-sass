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
        image: coverImageUrl ?? undefined,
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
