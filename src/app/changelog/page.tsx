import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";

export const metadata: Metadata = {
  title: "История изменений",
  description: "Последние обновления и новые возможности qr-s.ru — генератора QR-кодов для бизнеса.",
  openGraph: {
    title: "История изменений | qr-s.ru",
    description: "Последние обновления и новые возможности qr-s.ru.",
    url: "/changelog",
  },
};

const changelog: {
  date: string;
  version?: string;
  items: { type: "feature" | "improvement" | "fix"; text: string }[];
}[] = [
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
      { type: "feature", text: "Расширенные форматы экспорта: JPG, EPS, PDF для печати" },
      { type: "feature", text: "Bulk-создание QR — загрузка CSV/Excel, генерация сотен кодов, ZIP-выгрузка" },
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
          <article key={release.date} style={{ paddingLeft: "24px", borderLeft: "2px solid var(--border-default)" }}>
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
