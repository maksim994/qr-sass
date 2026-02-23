export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  heading: string;
  bullets: string[];
  cta: string;
  keywords: string[];
};

const seoPages: SeoPage[] = [
  {
    slug: "generator-qr-kodov",
    title: "Генератор QR-кодов для бизнеса",
    description: "Создавайте статические и динамические QR-коды с аналитикой и гибким дизайном.",
    heading: "Создавайте QR-коды за 10 секунд",
    bullets: ["Статические и динамические QR", "Экспорт PNG и SVG", "Аналитика сканов и UTM", "Современные шаблоны"],
    cta: "Создать первый QR",
    keywords: ["генератор qr", "динамический qr-код", "qr аналитика"],
  },
  {
    slug: "dinamicheskiy-qr-kod",
    title: "Динамические QR-коды с редактированием ссылки",
    description: "Меняйте ссылку после печати и отслеживайте эффективность кампаний в реальном времени.",
    heading: "Динамический QR без перепечатки",
    bullets: ["Смена URL в один клик", "История изменений", "Отчеты по устройствам", "Готово для SaaS-масштаба"],
    cta: "Запустить dynamic QR",
    keywords: ["динамический qr-код", "изменяемый qr", "qr редирект"],
  },
  {
    slug: "krasivyy-qr-kod",
    title: "Красивые QR-коды с настройкой форм",
    description: "Настройка формы точек, цветов и шаблонов с учетом качества сканирования.",
    heading: "Дизайн QR-кода без риска",
    bullets: ["Формы модулей и углов", "Оценка scannability", "Скачивание для печати", "Готовые пресеты"],
    cta: "Настроить дизайн",
    keywords: ["красивый qr", "дизайн qr кода", "qr с логотипом"],
  },
];

export function getSeoPages() {
  return seoPages;
}

export function getSeoPage(slug: string) {
  return seoPages.find((item) => item.slug === slug);
}
