import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "qr-s.ru — Генератор QR-кодов для бизнеса",
  description:
    "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией дизайна и мгновенным скачиванием. Бесплатный старт.",
  openGraph: {
    title: "qr-s.ru — Генератор QR-кодов для бизнеса",
    description:
      "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией дизайна и мгновенным скачиванием. Бесплатный старт.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "qr-s.ru — Генератор QR-кодов для бизнеса",
    description:
      "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией дизайна и мгновенным скачиванием. Бесплатный старт.",
  },
};

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      </svg>
    ),
    title: "20+ типов QR-кодов",
    description: "Ссылки, Wi-Fi, визитки, меню, PDF, видео, геолокация, соцсети — всё в одном сервисе. Статические и динамические.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
      </svg>
    ),
    title: "Динамика и аналитика",
    description: "Меняйте URL назначения в любой момент без перепечатки. История изменений, сканирования в реальном времени, география, устройства и UTM.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    title: "Кастомизация дизайна",
    description: "Форма модулей, цвета, углы, логотип. Встроенная проверка scannability защищает от нечитаемых кодов.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Retargeting и A/B-тесты",
    description: "Meta Pixel, Google Analytics, Яндекс Метрика, VK Пиксель на странице редиректа. A/B-тестирование двух вариантов URL с метриками конверсии.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "Экспорт для любых задач",
    description: "PNG, SVG, JPG, EPS, PDF — для цифровых каналов, полиграфии и типографии. Высокое качество под любые носители.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Защита и ограничения",
    description: "Пароль на просмотр контента, срок действия по дате или количеству сканов, экран согласия GDPR для EU.",
  },
];

const PLAN_CONFIG = [
  {
    id: "FREE" as const,
    description: "Для личного использования и тестирования",
    features: [
      "До 10 статических QR-кодов",
      "Экспорт PNG",
      "Базовая кастомизация",
      "1 пользователь",
    ],
    cta: "Начать бесплатно",
    href: "/register",
    highlighted: false,
  },
  {
    id: "PRO" as const,
    description: "Для бизнеса и маркетинговых команд",
    features: [
      "Неограниченные QR-коды",
      "Динамические QR с аналитикой",
      "Экспорт PNG и SVG",
      "Полная кастомизация дизайна",
      "До 5 пользователей",
      "Приоритетная поддержка",
    ],
    cta: "Попробовать 14 дней",
    href: "/register",
    highlighted: true,
  },
  {
    id: "BUSINESS" as const,
    description: "Для крупных компаний и агентств",
    features: [
      "Всё из тарифа Про",
      "Неограниченные пользователи",
      "API-доступ",
      "Белая метка (White Label)",
      "Расширенная аналитика",
      "SLA и персональный менеджер",
    ],
    cta: "Связаться с нами",
    href: "/register",
    highlighted: false,
  },
];

function formatPrice(rub: number): string {
  return rub.toLocaleString("ru-RU");
}

const faqs = [
  {
    question: "Что такое динамический QR-код?",
    answer:
      "Динамический QR-код перенаправляет на промежуточный URL, который вы можете изменить в любой момент. Это позволяет обновлять ссылку назначения без перепечатки материалов.",
  },
  {
    question: "Можно ли подключить аналитику и ретаргетинг?",
    answer:
      "Да. На странице редиректа поддерживаются Meta Pixel, Google Analytics, Яндекс Метрика и VK Пиксель. Также доступно A/B-тестирование двух вариантов URL.",
  },
  {
    question: "Какие форматы скачивания поддерживаются?",
    answer:
      "На платных тарифах доступны PNG, SVG, JPG, EPS и PDF. PNG и JPG подходят для цифровых каналов, SVG и EPS — для типографии, PDF — для полиграфии.",
  },
  {
    question: "Есть ли ограничения на бесплатном тарифе?",
    answer:
      "На бесплатном тарифе доступно создание до 10 статических QR-кодов с базовой кастомизацией. Динамические QR и аналитика доступны на платных тарифах.",
  },
  {
    question: "Как обеспечивается качество сканирования?",
    answer:
      "Встроенная система проверки scannability анализирует контрастность цветов, размер отступов и визуальные элементы, предупреждая о возможных проблемах со считыванием.",
  },
];

const testimonials = [
  {
    name: "Алексей Петров",
    role: "Маркетинг-директор, TechCorp",
    text: "Перешли на qr-s.ru с другого сервиса и ни разу не пожалели. Динамические QR-коды сэкономили нам десятки тысяч на перепечатке материалов.",
  },
  {
    name: "Мария Иванова",
    role: "Владелец кофейни",
    text: "Простой и понятный интерфейс. Создала QR-код для меню за 2 минуты, а когда обновила меню — просто поменяла ссылку. Гениально!",
  },
  {
    name: "Дмитрий Сидоров",
    role: "Event-менеджер, BigEvents",
    text: "Используем qr-s.ru для всех мероприятий. Аналитика по сканированиям помогает понять, какие каналы привлечения работают лучше всего.",
  },
  {
    name: "Елена Козлова",
    role: "HR-директор, StartupHub",
    text: "QR-коды на визитках сотрудников — это наш стандарт. Когда человек меняет должность, мы просто обновляем ссылку в системе.",
  },
  {
    name: "Игорь Волков",
    role: "Основатель, Digital Agency",
    text: "API-доступ и белая метка — именно то, что нам было нужно для интеграции в наш продукт. Отличная документация и поддержка.",
  },
  {
    name: "Анна Белова",
    role: "Ресторатор",
    text: "Красивые QR-коды с нашими цветами бренда смотрятся на столиках гораздо лучше, чем обычные чёрно-белые. Гости отмечают это!",
  },
];

const LATEST_POSTS_COUNT = 6;

export default async function HomePage() {
  const db = getDb();
  const [session, latestPosts, ...planInfos] = await Promise.all([
    getSession(),
    db.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: LATEST_POSTS_COUNT,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
        views: true,
        likes: true,
        readingTimeMinutes: true,
      },
    }),
    getPlan("FREE"),
    getPlan("PRO"),
    getPlan("BUSINESS"),
  ]);
  const plans = PLAN_CONFIG.map((cfg, i) => ({
    name: planInfos[i].name,
    price: formatPrice(planInfos[i].priceRub),
    description: cfg.description,
    features: cfg.features,
    cta: cfg.cta,
    href: cfg.href,
    highlighted: cfg.highlighted,
  }));
  let isAdmin = false;
  if (session?.sub) {
    try {
      const { getDb } = await import("@/lib/db");
      const user = await getDb().user.findUnique({
        where: { id: session.sub },
      });
      isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
    } catch {
      isAdmin = false;
    }
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "qr-s.ru",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      description: "Бесплатный тариф с поддержкой статических QR-кодов",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <SiteHeader session={session} isAdmin={isAdmin} />
      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="h-[600px] w-[600px] rounded-full bg-blue-100/60 blur-3xl" />
            </div>
            <div className="absolute right-0 top-1/4">
              <div className="h-[400px] w-[400px] rounded-full bg-indigo-100/40 blur-3xl" />
            </div>
          </div>
          <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center sm:pt-32 sm:pb-32">
            <div className="badge mx-auto mb-6">Бесплатный старт</div>
            <h1 className="heading-xl">
              Создавайте{" "}
              <span className="text-blue-600">QR-коды</span>
              <br />
              которые работают на вас
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Статические и динамические QR-коды с аналитикой, кастомизацией дизайна и мгновенным экспортом.
              Идеально для маркетинга, ресторанов, мероприятий и бизнеса.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register" className="btn btn-primary btn-lg">
                Начать бесплатно
              </Link>
              <a href="#features" className="btn btn-secondary btn-lg">
                Узнать больше
              </a>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-blue-600">Возможности</p>
              <h2 className="heading-lg mt-2">Всё для работы с QR-кодами</h2>
              <p className="text-body mt-4">
                От простой генерации до продвинутой аналитики — один сервис закрывает все задачи.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                    {feature.icon}
                  </div>
                  <h3 className="heading-md mt-4">{feature.title}</h3>
                  <p className="text-body mt-2">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-blue-600">Отзывы</p>
              <h2 className="heading-lg mt-2">Нам доверяют тысячи компаний</h2>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="card-flat p-6">
                  <p className="text-body leading-relaxed">&laquo;{t.text}&raquo;</p>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-blue-600">Тарифы</p>
              <h2 className="heading-lg mt-2">Простые и понятные цены</h2>
              <p className="text-body mt-4">
                Начните бесплатно и масштабируйтесь по мере роста. Без скрытых платежей.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-8 ${
                    plan.highlighted
                      ? "bg-blue-600 shadow-xl ring-2 ring-blue-600"
                      : "card"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold text-blue-600 shadow-sm">
                      Популярный
                    </span>
                  )}
                  <div className="flex flex-col flex-1">
                    <h3 className={`text-lg font-semibold ${plan.highlighted ? "!text-white" : "text-slate-900"}`}>
                      {plan.name}
                    </h3>
                    <p className={`mt-1 text-sm ${plan.highlighted ? "!text-white/90" : "text-slate-500"}`}>
                      {plan.description}
                    </p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className={`text-4xl font-bold tracking-tight ${plan.highlighted ? "!text-white" : "text-slate-900"}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm ${plan.highlighted ? "!text-white/80" : "text-slate-500"}`}>
                        ₽/мес
                      </span>
                    </div>
                    <ul className="mt-8 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm">
                          <svg
                            className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "!text-white" : "text-blue-600"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className={plan.highlighted ? "!text-white" : "text-slate-600"}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={plan.href}
                    className={`mt-8 shrink-0 block w-full rounded-full py-3 text-center text-sm font-semibold transition ${
                      plan.highlighted
                        ? "bg-white !text-blue-600 hover:bg-blue-50"
                        : "bg-blue-600 !text-white hover:bg-blue-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-600">FAQ</p>
              <h2 className="heading-lg mt-2">Частые вопросы</h2>
            </div>
            <dl className="mt-16 space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="card-flat p-6">
                  <dt className="text-base font-semibold text-slate-900">{faq.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Latest Blog Posts ── */}
        <section id="blog" className="bg-slate-50 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-blue-600">Блог</p>
                <h2 className="heading-lg mt-2">Последние статьи</h2>
                <p className="text-body mt-2">
                  Полезные материалы о QR-кодах, маркетинге и аналитике.
                </p>
              </div>
              <Link href="/blog" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">
                Все статьи →
              </Link>
            </div>
            {latestPosts.length === 0 ? (
              <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Пока нет опубликованных статей. Следите за обновлениями!
              </div>
            ) : (
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((post, index) => (
                  <article
                    key={post.slug}
                    className="card overflow-hidden transition hover:shadow-lg"
                  >
                    <Link href={`/blog/${post.slug}`} className="block">
                      {post.coverImageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-slate-100">
                          <Image
                            src={post.coverImageUrl}
                            alt={post.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                            priority={index < 3}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-full rounded-t-2xl bg-slate-200" />
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-slate-900">{post.title}</h3>
                        {post.excerpt && (
                          <p className="mt-2 line-clamp-2 text-slate-600">{post.excerpt}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <time dateTime={post.publishedAt!.toISOString()}>
                            {new Date(post.publishedAt!).toLocaleDateString("ru", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                          {post.readingTimeMinutes != null && (
                            <span>· {post.readingTimeMinutes} мин</span>
                          )}
                          <span>· {post.views} просмотров</span>
                          {post.likes > 0 && (
                            <span className="inline-flex items-center gap-1">
                              · {post.likes}{" "}
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-blue-600 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Готовы создать первый QR-код?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Регистрация занимает 30 секунд. Кредитная карта не нужна.
            </p>
            <Link href="/register" className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-blue-600 shadow-lg transition hover:bg-blue-50">
              Начать бесплатно
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter session={session} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
