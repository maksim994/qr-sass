import { COMMERCIAL, rubles } from "@/lib/commercial-config";
import { QR_LIFETIME } from "@/lib/qr-lifetime-policy";
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
    heading: "Генератор QR-кодов онлайн — бесплатно и без регистрации",
    noindex: false,
  },
  {
    path: "/blog",
    label: "Блог",
    title: "Блог — qr-s.ru | qr-s.ru",
    description: "Полезные статьи о QR-кодах, динамических ссылках и маркетинге для бизнеса.",
    heading: "Статьи о QR-кодах",
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
    title: "Контакты и реквизиты | QR-S | qr-s.ru",
    description: "Контакты продавца QR-S: email, телефон, Telegram, реквизиты и способы оплаты.",
    heading: "Контакты и реквизиты",
    noindex: false,
  },
  {
    path: "/skaner-qr-koda",
    label: "Сканер QR",
    title: "Сканер QR-кода онлайн: с камеры, по фото и скриншоту | qr-s.ru",
    description:
      "Отсканируй QR-код камерой телефона или ноутбука, загрузи фото или вставь скриншот через Ctrl+V. Без регистрации, изображение не покидает браузер. Ссылки, Wi-Fi, контакты.",
    heading: "Сканер QR-кода онлайн",
    noindex: false,
  },
  {
    path: "/qr-s-logotipom",
    label: "QR с логотипом",
    title: "QR-код с логотипом онлайн: PNG и SVG без регистрации | qr-s.ru",
    description: "Сделай QR-код с логотипом онлайн: загрузи PNG, JPEG или WebP, скачай PNG или SVG 1200×1200 без регистрации. Логотип обрабатывается в браузере, на сервер не уходит.",
    heading: "QR-код с логотипом",
    noindex: false,
  },
  {
    path: "/personal-data-consent",
    label: "Согласие на ПДн",
    title: "Согласие на обработку персональных данных | qr-s.ru",
    description: "Согласие на обработку персональных данных QR-S.ru: условия, права пользователя и контакты оператора.",
    heading: "Согласие на обработку персональных данных",
    noindex: false,
  },
  {
    path: "/changelog",
    label: "История изменений",
    title: "История изменений | qr-s.ru",
    description: "Последние обновления qr-s.ru: динамические QR, честные тарифы и исправления публичных текстов.",
    heading: "История изменений",
    noindex: false,
  },
  {
    path: "/qr-lifetime",
    label: "Срок работы QR",
    title: "Как долго работает напечатанный QR-код — qr-s.ru | qr-s.ru",
    description: "Напечатанные QR продолжают открываться после окончания тарифа. Два динамических кода бесплатно: меняйте ссылку в кабинете без перепечатки.",
    heading: QR_LIFETIME.title,
    noindex: false,
  },
  {
    path: "/privacy-policy",
    label: "Политика конфиденциальности",
    title: "Политика конфиденциальности | qr-s.ru",
    description: "Политика конфиденциальности QR-S.ru: условия, права пользователя и контакты оператора.",
    heading: "Политика конфиденциальности",
    noindex: false,
  },
  {
    path: "/terms-of-service",
    label: "Пользовательское соглашение",
    title: "Публичная оферта и пользовательское соглашение | qr-s.ru",
    description: "Публичная оферта QR-S.ru: услуги, принятие условий, оплата, сроки доступа, возврат и реквизиты исполнителя.",
    heading: "Публичная оферта и пользовательское соглашение",
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
  const pricing = byPath.get("/pricing")!;
  const defaults = pricingSeoDefaults(COMMERCIAL.pro.priceRub);
  byPath.set("/pricing", { ...pricing, ...defaults, title: `${defaults.title} | qr-s.ru` });
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, "ru"));
}

export function getSeoPageCatalogEntry(path: string): SeoPageCatalogEntry | null {
  const normalized = sitemapPathname(path);
  return getSeoPageCatalog().find((entry) => entry.path === normalized) ?? null;
}

export function pricingSeoDefaults(priceRub: number) {
  return {
    title: `Тарифы QR-S: динамические QR-коды от ${rubles(priceRub)} в месяц`,
    description: `Статические QR и ${COMMERCIAL.free.dynamic} динамических бесплатно. Про — ${rubles(priceRub)} в месяц, ${COMMERCIAL.trialDays} дней без карты. Сравните тарифы и возможности.`,
    heading: `Тарифы QR-S: бесплатно, Про за ${rubles(priceRub)} и Бизнес`,
    noindex: false,
  };
}
