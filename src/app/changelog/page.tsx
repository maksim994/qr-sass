import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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

const typeStyles = {
  feature: "bg-green-100 text-green-700",
  improvement: "bg-blue-100 text-blue-700",
  fix: "bg-amber-100 text-amber-700",
};

export default async function ChangelogPage() {
  const session = await getSession();
  const db = await getDb();
  const isAdmin = session
    ? !!(await db.user.findUnique({ where: { id: session.sub }, select: { isAdmin: true } }))?.isAdmin
    : false;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader session={session} isAdmin={isAdmin} />
      <main>
      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-semibold text-blue-600">Changelog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            История изменений
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Здесь мы публикуем все важные обновления — новые функции, улучшения и исправления.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-12">
            {changelog.map((release) => (
              <article
                key={release.date}
                className="border-l-2 border-slate-200 pl-6"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <time
                    dateTime={release.date}
                    className="text-sm font-semibold text-slate-900"
                  >
                    {new Date(release.date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {release.version && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      v{release.version}
                    </span>
                  )}
                </div>
                <ul className="mt-4 space-y-2">
                  {release.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${typeStyles[item.type]}`}
                      >
                        {typeLabels[item.type]}
                      </span>
                      <span className="text-slate-600">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              На главную
            </Link>
          </div>
        </div>
      </section>
      </main>
      <SiteFooter session={session} />
    </div>
  );
}
