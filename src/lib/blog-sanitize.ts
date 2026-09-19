const EDITORIAL_TOKEN = "B(?:16|25|26|28|33|36)|CTA|Workflow";
const EDITORIAL_HEADING = new RegExp(
  `<h([1-6])\\b[^>]*>\\s*(?:${EDITORIAL_TOKEN})\\s*</h\\1>`,
  "gi",
);
const EDITORIAL_PARENS = new RegExp(`\\s*\\((?:${EDITORIAL_TOKEN})\\)`, "gi");
const EDITORIAL_PREFIX = new RegExp(`\\b(?:${EDITORIAL_TOKEN}):\\s*`, "gi");
const EDITORIAL_WORD = new RegExp(`\\b(?:${EDITORIAL_TOKEN})\\b`, "g");

const FLOW_NOTICES: Record<string, string> = {
  "qr-kod-dlya-kalendarya":
    "В QR-S.ru нет отдельного типа «календарь» и нет встроенного генератора ICS. Сделайте динамическую ссылку на страницу события или на файл .ics. Чистый ICS внутри QR собирают внешние генераторы.",
  "qr-kod-dlya-telegram-kanala":
    "Отдельного типа Telegram нет. Создайте динамическую ссылку на t.me — так можно сменить адрес без перепечатки и смотреть открытия по дням.",
  "qr-kod-dlya-max":
    "Отдельного типа MAX нет. Создайте динамическую ссылку на профиль или чат.",
  "qr-kod-dlya-vkontakte":
    "Отдельного типа ВКонтакте нет. Создайте динамическую ссылку на vk.com.",
  "qr-kod-dlya-oprosa":
    "Опрос — это ссылка на Яндекс Формы или другую форму. В кабинете выберите тип «Ссылка», не отдельный генератор анкет.",
  "qr-kod-oplata-sbp":
    "QR-S.ru не выпускает кассовый QR СБП. Можно закодировать ссылку на страницу оплаты, которую дал банк или касса.",
  "qr-kod-na-2gis":
    "Карточка 2ГИС — это обычная ссылка. Географии сканов в кабинете нет.",
  "qr-kod-na-yandeks-karty":
    "Карточка Яндекс Карт — это обычная ссылка. Географии сканов в кабинете нет.",
  "qr-kod-s-analitikoj-i-korotkoj-ssylkoj":
    "Считаются открытия динамического QR по календарным дням и типу устройства. Нет карты, городов и уникальных посетителей.",
  "qr-kod-s-utm-metkami":
    "UTM вы добавляете в свою ссылку. Кабинет считает открытия QR, а не сессии в Метрике.",
  "massovaya-generaciya-qr-kodov":
    "Пакет из CSV есть, лимит строк за загрузку зависит от тарифа (50 / 1000 / 5000). Это не тысячи кодов за минуту и не отдельная очередь.",
  "qr-kod-ssylka-na-prilozhenie":
    "Тип «Приложение» кодирует ссылки на магазины. Smart-link и атрибуция установок — на стороне магазина, не в QR-S.ru.",
};

function holdImageSrcs(html: string): { html: string; restore: (value: string) => string } {
  const held: string[] = [];
  const next = html.replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (_full, start, url, end) => {
    held.push(String(url));
    return `${start}@@IMG${held.length - 1}@@${end}`;
  });
  return {
    html: next,
    restore: (value: string) => value.replace(/@@IMG(\d+)@@/g, (_m, index: string) => held[Number(index)] ?? ""),
  };
}

export function rewriteWrongBrand(text: string): string {
  const { html, restore } = holdImageSrcs(text);
  const rewritten = html
    .replace(/https?:\/\/(?:www\.)?gr-s\.ru/gi, "https://qr-s.ru")
    .replace(/https?:\/\/(?:www\.)?g-qr\.ru/gi, "https://qr-s.ru")
    .replace(/\bgr-s\.ru\b/gi, "qr-s.ru")
    .replace(/\bg-qr\.ru\b/gi, "qr-s.ru")
    .replace(/\bGR-S\b/g, "QR-S");
  return restore(rewritten);
}

export function stripEditorialMarkers(text: string): string {
  return text
    .replace(EDITORIAL_HEADING, "")
    .replace(EDITORIAL_PARENS, "")
    .replace(EDITORIAL_PREFIX, "")
    .replace(EDITORIAL_WORD, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?,(?= )/g, ",")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/>\s+</g, "><");
}

export function sanitizeBlogText(text: string | null | undefined): string {
  if (!text) return "";
  return stripEditorialMarkers(rewriteWrongBrand(text)).trim();
}

function noticeHtml(slug: string): string {
  const notice = FLOW_NOTICES[slug];
  if (!notice) return "";
  return `<p><strong>Как это сделано в QR-S.ru.</strong> ${notice}</p>`;
}

export function sanitizeBlogHtml(html: string, slug?: string): string {
  let next = stripEditorialMarkers(rewriteWrongBrand(html));
  if (slug && FLOW_NOTICES[slug] && !next.includes("Как это сделано в QR-S.ru.")) {
    next = `${noticeHtml(slug)}${next}`;
  }
  return next;
}

export type BlogSanitizeFields = {
  title?: string | null;
  excerpt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string | null;
  structuredData?: string | null;
  slug?: string | null;
};

export function sanitizeBlogFields<T extends BlogSanitizeFields>(fields: T): T {
  const slug = fields.slug ?? undefined;
  return {
    ...fields,
    title: fields.title != null ? sanitizeBlogText(fields.title) : fields.title,
    excerpt: fields.excerpt != null ? sanitizeBlogText(fields.excerpt) : fields.excerpt,
    metaTitle: fields.metaTitle != null ? sanitizeBlogText(fields.metaTitle) : fields.metaTitle,
    metaDescription: fields.metaDescription != null ? sanitizeBlogText(fields.metaDescription) : fields.metaDescription,
    content: fields.content != null ? sanitizeBlogHtml(fields.content, slug ?? undefined) : fields.content,
    structuredData: fields.structuredData != null ? sanitizeBlogText(fields.structuredData) : fields.structuredData,
  };
}

export function blogFlowNotice(slug: string): string | null {
  return FLOW_NOTICES[slug] ?? null;
}
