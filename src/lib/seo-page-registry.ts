import { getSeoPages } from "@/lib/seo-content";
import { searchLandings } from "@/lib/search-landings";
import { sitemapPathname } from "@/lib/seo-hygiene";

export type SeoPageCatalogEntry = {
  path: string;
  label: string;
  title: string;
  description: string;
  heading: string | null;
  noindex: boolean;
};

const STATIC_CATALOG: SeoPageCatalogEntry[] = [
  {
    path: "/",
    label: "Главная",
    title: "Генератор QR-кодов онлайн бесплатно — создать QR-код | QR-S",
    description:
      "Создать QR-код онлайн бесплатно и без регистрации: ссылка, Wi-Fi, контакты и текст. Скачайте PNG или SVG. Два динамических QR-кода бесплатно после регистрации.",
    heading: null,
    noindex: false,
  },
  {
    path: "/blog",
    label: "Блог",
    title: "Блог QR-S: инструкции и идеи для QR-кодов",
    description: "Статьи о QR-кодах: печать, динамические ссылки, отзывы, меню и маркетинг.",
    heading: null,
    noindex: false,
  },
  {
    path: "/pricing",
    label: "Тарифы",
    title: "Тарифы QR-S: динамические QR-коды",
    description: "Сравните бесплатные возможности, Про и Бизнес: лимиты, CSV, API и аналитика.",
    heading: null,
    noindex: false,
  },
  {
    path: "/contacts",
    label: "Контакты",
    title: "Контакты и реквизиты | QR-S",
    description: "Контакты продавца QR-S: email, телефон, Telegram, реквизиты и способы оплаты.",
    heading: null,
    noindex: false,
  },
  {
    path: "/skaner-qr-koda",
    label: "Сканер QR",
    title: "Сканер QR-кода онлайн: с камеры, по фото и скриншоту",
    description:
      "Отсканируй QR-код камерой телефона или ноутбука, загрузи фото или вставь скриншот через Ctrl+V. Без регистрации, изображение не покидает браузер. Ссылки, Wi-Fi, контакты.",
    heading: "Сканер QR-кода онлайн",
    noindex: false,
  },
  {
    path: "/qr-s-logotipom",
    label: "QR с логотипом",
    title: "QR-код с логотипом в центре — создать онлайн | QR-S",
    description: "Добавьте логотип в центр QR-кода и скачайте PNG или SVG. Бесплатно и без регистрации.",
    heading: null,
    noindex: false,
  },
  {
    path: "/personal-data-consent",
    label: "Согласие на ПДн",
    title: "Согласие на обработку персональных данных | QR-S",
    description: "Текст согласия на обработку персональных данных сервиса QR-S.",
    heading: null,
    noindex: false,
  },
  {
    path: "/changelog",
    label: "История изменений",
    title: "История изменений QR-S",
    description: "Что нового в сервисе QR-S: обновления генератора, кабинета и тарифов.",
    heading: null,
    noindex: false,
  },
  {
    path: "/qr-lifetime",
    label: "Срок работы QR",
    title: "Срок работы QR-кода и условия доступа | QR-S",
    description: "Как долго работают статические и динамические QR-коды QR-S и что влияет на доступность ссылки.",
    heading: null,
    noindex: false,
  },
  {
    path: "/privacy-policy",
    label: "Политика конфиденциальности",
    title: "Политика конфиденциальности | QR-S",
    description: "Как QR-S обрабатывает персональные данные пользователей и посетителей сайта.",
    heading: null,
    noindex: false,
  },
  {
    path: "/terms-of-service",
    label: "Пользовательское соглашение",
    title: "Пользовательское соглашение | QR-S",
    description: "Условия использования сервиса QR-S.",
    heading: null,
    noindex: false,
  },
];

function fromSearchLanding(): SeoPageCatalogEntry[] {
  return searchLandings.map((page) => ({
    path: `/${page.slug}`,
    label: page.label,
    title: page.title,
    description: page.description,
    heading: page.heading,
    noindex: Boolean(page.noindex),
  }));
}

function fromMarketingSeoPages(): SeoPageCatalogEntry[] {
  return getSeoPages().map((page) => ({
    path: `/${page.slug}`,
    label: page.heading,
    title: page.title,
    description: page.description,
    heading: page.heading,
    noindex: false,
  }));
}

/** Known public URLs with SEO defaults from code. Search landings win over marketing duplicates. */
export function getSeoPageCatalog(): SeoPageCatalogEntry[] {
  const byPath = new Map<string, SeoPageCatalogEntry>();
  for (const entry of [...STATIC_CATALOG, ...fromMarketingSeoPages(), ...fromSearchLanding()]) {
    byPath.set(sitemapPathname(entry.path), entry);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, "ru"));
}

export function getSeoPageCatalogEntry(path: string): SeoPageCatalogEntry | null {
  const normalized = sitemapPathname(path);
  return getSeoPageCatalog().find((entry) => entry.path === normalized) ?? null;
}
