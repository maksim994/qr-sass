import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { publicSiteUrl } from "@/lib/public-url";

export const metadata: Metadata = {
  title: "История изменений",
  description: "Последние обновления qr-s.ru: динамические QR, честные тарифы и исправления публичных текстов.",
  alternates: { canonical: publicSiteUrl("/changelog") },
  openGraph: {
    title: "История изменений | qr-s.ru",
    description: "Последние обновления qr-s.ru.",
    url: publicSiteUrl("/changelog"),
  },
};

const changelog: {
  date: string;
  version: string;
  items: { type: "feature" | "improvement" | "fix"; text: string }[];
}[] = [
  {
    date: "2026-09-18",
    version: "1.6",
    items: [
      { type: "feature", text: "Серверная воронка: регистрация → QR → скачивание → первое внешнее открытие → оплата SUCCEEDED" },
      { type: "fix", text: "Клик виджета ЮKassa больше не считается оплатой; боты и просмотры из кабинета не входят в отчёт" },
      { type: "improvement", text: "Админка /admin/funnel и когорты по ISO-неделе (Москва)" },
    ],
  },
  {
    date: "2026-09-18",
    version: "1.5",
    items: [
      { type: "fix", text: "Sitemap без login/register; служебные и клиентские QR не индексируются" },
      { type: "improvement", text: "Canonical на блоге, политике и соглашении; пагинация блога с noindex" },
      { type: "improvement", text: "robots.txt не блокирует login — робот может прочитать noindex и убрать страницу из выдачи" },
    ],
  },
  {
    date: "2026-09-18",
    version: "1.4",
    items: [
      { type: "improvement", text: "Главная: H1 про смену ссылки после печати; бесплатный тариф — статика, Про — проба динамики 14 дней" },
      { type: "feature", text: "Посадочные /qr-menu и /qr-for-packaging с формой динамической ссылки, без подстановки чужого URL" },
      { type: "improvement", text: "Шапка гостя ведёт в создание QR, не в пустой кабинет" },
    ],
  },
  {
    date: "2026-09-18",
    version: "1.3",
    items: [
      { type: "improvement", text: "Публичные тексты: бренд QR-S.ru, без чужих доменов и служебных пометок в статьях" },
      { type: "improvement", text: "Тарифы и аналитика без географии, белой метки и гарантии сканирования" },
      { type: "fix", text: "Canonical без двойного слэша; login/register не попадают в sitemap" },
    ],
  },
  {
    date: "2026-03-10",
    version: "1.2.1",
    items: [
      { type: "feature", text: "IndexNow — уведомление Яндекса и Bing об изменениях при публикации и обновлении постов блога" },
      { type: "feature", text: "Редактируемый robots.txt в админке — полный контроль над индексацией" },
      { type: "feature", text: "Загрузка favicon в админке — иконка сайта настраивается через S3" },
      { type: "improvement", text: "SEO: WebSite и Organization schema на главной, keywords, canonical URL" },
      { type: "fix", text: "Главная страница работает при недоступности БД — fallback для разработки" },
      { type: "fix", text: "Предупреждение React о unique key в layout headContent" },
    ],
  },
  {
    date: "2025-02-23",
    version: "1.2",
    items: [
      { type: "feature", text: "VK Пиксель в блоке Retargeting — отслеживание конверсий для рекламы ВКонтакте" },
      { type: "improvement", text: "Блоки Retargeting, A/B-тестирование и Срок действия теперь в виде раскрывающихся спойлеров" },
      { type: "improvement", text: "Обновлён блок возможностей на главной странице — актуальное описание функционала" },
      { type: "fix", text: "Исправлена верификация пароля — форма корректно отправляет запрос на текущий домен" },
    ],
  },
  {
    date: "2025-02-22",
    version: "1.1",
    items: [
      { type: "feature", text: "Яндекс Метрика в Retargeting — аналитика для российского рынка" },
      { type: "improvement", text: "Переключатель Статический/Динамический в виде табов вместо выпадающего списка" },
      { type: "improvement", text: "Smart redirect, Retargeting, A/B-тестирование и Срок действия доступны прямо на странице создания QR" },
      { type: "improvement", text: "Последние статьи блога на главной странице" },
    ],
  },
  {
    date: "2025-02-21",
    version: "1.0",
    items: [
      { type: "feature", text: "Retargeting: Meta Pixel, Google Analytics (GA4), GTM на странице редиректа" },
      { type: "feature", text: "A/B-тестирование двух вариантов URL с метриками конверсии" },
      { type: "feature", text: "Пароль на QR — ввод пароля перед показом контента" },
      { type: "feature", text: "Срок действия — ограничение по дате или количеству сканов" },
      { type: "feature", text: "GDPR-gate — экран согласия с политикой конфиденциальности для EU" },
      { type: "feature", text: "Расширенные форматы экспорта: JPG, EPS и PDF как растровая картинка QR, не вектор" },
      { type: "feature", text: "Пакетное создание QR из CSV в пределах лимита тарифа, выгрузка ZIP" },
      { type: "feature", text: "Smart redirect по устройству — разные URL для iOS, Android и Desktop" },
    ],
  },
];

const typeLabels = {
  feature: "Новое",
  improvement: "Улучшение",
  fix: "Исправление",
};

const typeBadgeClass = {
  feature: "fk-badge fk-badge--success",
  improvement: "fk-badge fk-badge--primary",
  fix: "fk-badge fk-badge--warning",
};

export default async function ChangelogPage() {
  const session = await getSession();
  const db = getDb();
  const isAdmin = session
    ? !!(await db.user.findUnique({ where: { id: session.sub }, select: { isAdmin: true } }))?.isAdmin
    : false;

  return (
    <LegalArticleLayout
      session={session}
      isAdmin={isAdmin}
      eyebrow="Changelog"
      title="История изменений"
      updatedLabel="Здесь мы публикуем все важные обновления — новые функции, улучшения и исправления."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        {changelog.map((release) => (
          <article key={release.version} style={{ paddingLeft: "24px", borderLeft: "2px solid var(--border-default)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "12px" }}>
              <time dateTime={release.date} style={{ font: "var(--fw-semibold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
                {new Date(release.date).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {release.version && <span className="fk-badge">{`v${release.version}`}</span>}
            </div>
            <ul style={{ marginTop: "16px", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {release.items.map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span className={typeBadgeClass[item.type]} style={{ flexShrink: 0 }}>
                    {typeLabels[item.type]}
                  </span>
                  <span style={{ font: "var(--fw-regular) var(--fs-sm)/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </LegalArticleLayout>
  );
}
