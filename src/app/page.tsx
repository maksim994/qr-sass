import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan, getPlanSync, type PlanId } from "@/lib/plans";
import { qrTypes } from "@/lib/qr-types";
import { getDisabledQrTypes } from "@/lib/disabled-qr-types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { HomeHeroVisual } from "@/components/landing/home-hero-visual";
import { BlogCardIcon } from "@/components/blog/blog-card-icon";
import { getBlogCardMeta } from "@/lib/blog-card-meta";

export const dynamic = "force-dynamic";

const baseUrl = process.env.APP_URL ?? "https://qr-s.ru";

export const metadata: Metadata = {
  title: "qr-s.ru — QR-коды, которыми можно управлять после печати",
  description:
    "Меняйте ссылку без перепечатки, измеряйте сканирования и работайте командой. Динамические QR для рекламы, меню и упаковки. Бесплатный старт.",
  keywords: [
    "генератор qr кодов",
    "создать qr код",
    "динамический qr код",
    "qr код онлайн",
    "qr аналитика",
    "красивый qr код",
  ],
  alternates: { canonical: baseUrl },
  openGraph: {
    title: "qr-s.ru — QR-коды, которыми можно управлять после печати",
    description:
      "Меняйте ссылку без перепечатки, измеряйте сканирования и работайте командой. Динамические QR для рекламы, меню и упаковки.",
    url: baseUrl,
  },
};

const PLAN_META: Record<
  PlanId,
  { cta: string; href: string; highlighted: boolean }
> = {
  FREE: { cta: "Начать бесплатно", href: "/register", highlighted: false },
  PRO: { cta: "Попробовать 14 дней", href: "/register", highlighted: true },
  BUSINESS: { cta: "Перейти к оплате", href: "/register", highlighted: false },
};

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
      </svg>
    ),
    title: "Меняйте ссылку после печати",
    description: "Не переделывайте меню, упаковку и рекламу — обновите URL в кабинете за секунды.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: "Узнайте, кто сканирует",
    description: "Где, когда и с каких устройств открывают QR — география, устройства и динамика по дням.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Работайте всей командой",
    description: "Общий workspace, роли и доступ к одним и тем же QR — для сетей, агентств и отделов маркетинга.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
      </svg>
    ),
    title: "Сотни QR из CSV",
    description: "Загрузите таблицу с URL и UTM — получите архив кодов для кампаний, SKU и персональных ссылок.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.3-10-8.3Z" />
      </svg>
    ),
    title: "Дизайн под бренд",
    description: "Цвета, форма модулей, логотип. Проверка читаемости не даст напечатать несканируемый код.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Контроль доступа",
    description: "Пароль, срок действия, лимит сканов, A/B-тесты и пиксели ретаргетинга на странице перехода.",
  },
];

const stats = [
  { value: "20+", label: "типов QR-кодов" },
  { value: "Динамика", label: "смена ссылки без перепечатки" },
  { value: "Команда", label: "роли и общий workspace" },
  { value: "CSV", label: "массовое создание с UTM" },
];

const useCases = [
  {
    title: "Рестораны и кафе",
    text: "QR-меню на столиках: обновили блюда — гости видят новую версию без перепечатки.",
    href: "/qr-menu",
  },
  {
    title: "Упаковка товара",
    text: "Инструкция, акция или отзывы на упаковке. Контент меняете после тиража.",
    href: "/qr-for-packaging",
  },
  {
    title: "Агентства",
    text: "Сотни кодов для клиентов из CSV, роли в команде и API для интеграций.",
    href: "/qr-for-agencies",
  },
  {
    title: "Мероприятия",
    text: "Регистрация, программа и стенды — разные QR и аналитика по зонам.",
    href: "/qr-for-events",
  },
];

const howSteps = [
  { step: "01", title: "Выберите задачу", text: "Ссылка, меню, файл или визитка. Предпросмотр обновляется сразу." },
  { step: "02", title: "Оформите и сохраните", text: "Цвета бренда, логотип, проверка читаемости. Скачайте PNG/SVG или разместите динамический код." },
  { step: "03", title: "Управляйте после печати", text: "Меняйте ссылку, смотрите сканы и подключайте команду — без новых макетов." },
];

const faqs = [
  { question: "Чем динамический QR лучше бесплатного генератора картинки?", answer: "Статический код «зашивает» ссылку навсегда. Динамический ведёт на короткий URL QR-S.ru: вы меняете назначение, считаете сканы и ограничиваете доступ — без перепечатки материалов." },
  { question: "Что такое динамический QR-код?", answer: "Динамический QR перенаправляет на промежуточный URL, который можно изменить в любой момент. Это позволяет обновлять ссылку назначения без перепечатки меню, упаковки и рекламы." },
  { question: "Можно ли подключить аналитику и ретаргетинг?", answer: "Да. На странице редиректа поддерживаются Meta Pixel, Google Analytics, Яндекс Метрика и VK Пиксель. Также доступно A/B-тестирование двух вариантов URL." },
  { question: "Какие форматы скачивания поддерживаются?", answer: "На платных тарифах доступны PNG, SVG, JPG, EPS и PDF. PNG и JPG подходят для цифровых каналов, SVG и EPS — для типографии, PDF — для полиграфии." },
  { question: "Есть ли ограничения на бесплатном тарифе?", answer: "На бесплатном тарифе — до 10 статических QR с базовой кастомизацией. Динамика, аналитика, bulk и команда — на тарифах Про и Бизнес." },
  { question: "Как обеспечивается качество сканирования?", answer: "Встроенная проверка scannability анализирует контраст, отступы и логотип и предупреждает, если код может плохо считываться." },
];

const testimonials = [
  {
    name: "Сценарий: сеть кафе",
    role: "Меню и акции",
    text: "Один QR на стол — сезонное меню и акции обновляются в кабинете, без новой печати наклейки.",
  },
  {
    name: "Сценарий: производитель",
    role: "Упаковка и инструкции",
    text: "На тираже печатаете стабильный код, а внутри ведёте на актуальную инструкцию или розыгрыш.",
  },
  {
    name: "Сценарий: агентство",
    role: "Кампании клиентов",
    text: "Создаёте сотни персональных кодов из CSV за минуты и смотрите, какие стойки дают больше сканов.",
  },
  {
    name: "Сценарий: ивент",
    role: "Регистрация и зоны",
    text: "Разные QR на вход, стенды и раздатку — сравниваете отклик по площадкам в одном отчёте.",
  },
  {
    name: "Сценарий: HR",
    role: "Вакансии и визитки",
    text: "На бейдже или визитке — динамическая ссылка: сменили должность или лендинг вакансии без перепечатки.",
  },
  {
    name: "Сценарий: retail",
    role: "Наружная и полка",
    text: "Меняете акцию на баннере или ценнике, а QR на носителе остаётся тем же.",
  },
];

const LATEST_POSTS_COUNT = 20;

function formatPrice(rub: number): string {
  return rub.toLocaleString("ru-RU");
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description?: string }) {
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <span
        className="fk-eyebrow"
        style={{
          display: "inline-block",
          font: "var(--fw-bold) 12px/1 var(--font-sans)",
          letterSpacing: "0.08em",
          color: "var(--color-primary)",
        }}
      >
        {eyebrow}
      </span>
      <h2
        style={{
          marginTop: "12px",
          font: "var(--fw-bold) clamp(1.9rem, 3.2vw, 2.35rem)/1.15 var(--font-display)",
          letterSpacing: "-0.02em",
          color: "var(--text-strong)",
        }}
      >
        {title}
      </h2>
      {description && (
        <p style={{ margin: "14px auto 0", maxWidth: "560px", font: "var(--fw-regular) 1.05rem/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}

function CheckIcon({ color = "var(--color-success)" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: "1px" }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function HomePage() {
  const session = await getSession();

  let latestPosts: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    views: number;
    likes: number;
    readingTimeMinutes: number | null;
    category: { slug: string; name: string } | null;
  }> = [];
  let planInfos: Awaited<ReturnType<typeof getPlan>>[] = [];
  let disabledTypes: Awaited<ReturnType<typeof getDisabledQrTypes>> = [];

  try {
    const db = getDb();
    [latestPosts, disabledTypes, ...planInfos] = await Promise.all([
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
          category: { select: { slug: true, name: true } },
        },
      }),
      getDisabledQrTypes(),
      getPlan("FREE"),
      getPlan("PRO"),
      getPlan("BUSINESS"),
    ]);
  } catch {
    planInfos = [getPlanSync("FREE"), getPlanSync("PRO"), getPlanSync("BUSINESS")];
  }

  const plans = planInfos.map((plan) => ({
    ...plan,
    price: formatPrice(plan.priceRub),
    ...PLAN_META[plan.id],
  }));

  const enabledTypes = qrTypes
    .filter((t) => !disabledTypes.includes(t.type))
    .slice(0, 8);

  let isAdmin = false;
  if (session?.sub) {
    try {
      const user = await getDb().user.findUnique({ where: { id: session.sub } });
      isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
    } catch {
      isAdmin = false;
    }
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-page)", color: "var(--text-default)" }}>
      <SiteHeader session={session} isAdmin={isAdmin} />
      <main>
        {/* Hero */}
        <section id="hero" className="qrs-hero">
          <div className="fk-container qrs-hero-grid">
            <div className="qrs-hero-copy">
              <span className="fk-badge fk-badge--accent fk-badge--lg">
                <span className="fk-badge__dot" />
                Бесплатный старт · без карты
              </span>
              <h1>
                Создавайте <span style={{ color: "var(--color-primary)" }}>QR‑коды</span>,
                <br />
                которые работают на вас
              </h1>
              <p className="qrs-hero-lead">
                Меняйте ссылку после печати, измеряйте сканирования и работайте командой — для рекламы, меню и упаковки.
              </p>
              <div className="qrs-hero-cta">
                <Button href={session ? "/dashboard/create" : "/register"} variant="accent" size="lg">
                  Начать бесплатно
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
                <Button href="/dynamic-qr" variant="secondary" size="lg">
                  Что такое динамический QR
                </Button>
              </div>
              <div className="qrs-hero-checklist">
                {["Смена ссылки без перепечатки", "Аналитика сканирований", "Команда и массовое создание"].map((text) => (
                  <div key={text} className="flex items-center gap-2" style={{ font: "var(--fw-semibold) 13px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
                    <CheckIcon />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <HomeHeroVisual />
          </div>
        </section>

        {/* Stats */}
        <section className="qrs-stats-band" aria-label="Ключевые показатели" style={{ borderBlock: "1px solid var(--border-subtle)", background: "var(--surface-subtle)" }}>
          <div className="fk-container">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="tnum" style={{ font: "var(--fw-extra) clamp(1.8rem, 3.5vw, 2.4rem)/1 var(--font-display)", color: "var(--text-strong)" }}>
                  {s.value}
                </div>
                <div className="mt-1.5" style={{ font: "var(--fw-medium) 13px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="fk-section">
          <div className="fk-container">
            <SectionHeader
              eyebrow="Зачем QR-S.ru"
              title="Не просто генератор — управление после печати"
              description="Бесплатные картинки QR копируют. Ценность — в смене ссылки, аналитике и работе команды."
            />
            <div
              className="qrs-grid-3"
              style={{
                marginTop: "48px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "24px",
              }}
            >
              {features.map((f) => (
                <article
                  key={f.title}
                  className="qrs-card-lift"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "12px", boxShadow: "var(--shadow-sm)", padding: "28px" }}
                >
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ font: "var(--fw-bold) 1.2rem/1.3 var(--font-display)", color: "var(--text-strong)" }}>{f.title}</h3>
                  <p style={{ marginTop: "10px", font: "var(--fw-regular) 0.95rem/1.6 var(--font-sans)", color: "var(--text-muted)" }}>{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="use-cases" style={{ paddingBlock: "var(--section-y)", background: "var(--surface-card)" }}>
          <div className="fk-container">
            <SectionHeader
              eyebrow="Как используют"
              title="Отрасли, где динамический QR окупается сразу"
              description="Выберите сценарий — откроется страница с примерами и CTA."
            />
            <div
              className="qrs-grid-2"
              style={{
                marginTop: "40px",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              {useCases.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="qrs-row-lift"
                  style={{
                    display: "block",
                    padding: "24px 26px",
                    borderRadius: "14px",
                    border: "1px solid var(--border-default)",
                    background: "var(--surface-subtle)",
                  }}
                >
                  <div style={{ font: "var(--fw-bold) 1.1rem/1.3 var(--font-display)", color: "var(--text-strong)" }}>{item.title}</div>
                  <p style={{ marginTop: "8px", font: "var(--fw-regular) 0.95rem/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{item.text}</p>
                  <span className="qrs-navlink" style={{ display: "inline-block", marginTop: "12px" }}>
                    Подробнее →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* QR Types */}
        <section id="types" style={{ paddingBlock: "var(--section-y)", background: "var(--surface-subtle)", borderBlock: "1px solid var(--border-subtle)" }}>
          <div className="fk-container">
            <SectionHeader eyebrow="Типы кодов" title="Один QR-код под каждую задачу" description="Выберите тип контента — сервис соберёт код, страницу редиректа и аналитику автоматически." />
            <div
              className="qrs-grid-3"
              style={{
                marginTop: "44px",
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              {enabledTypes.map((t) => (
                <div key={t.type} style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "18px 18px 20px" }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="var(--color-primary)" strokeLinecap="round" strokeLinejoin="round">
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                  <div style={{ marginTop: "12px", font: "var(--fw-bold) 15px/1.2 var(--font-display)", color: "var(--text-strong)" }}>{t.label}</div>
                  <div style={{ marginTop: "4px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="fk-section">
          <div className="fk-container">
            <SectionHeader eyebrow="Как это работает" title="Три шага до готового кода" />
            <div
              className="qrs-grid-3"
              style={{
                marginTop: "48px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "24px",
              }}
            >
              {howSteps.map((s) => (
                <div key={s.step} style={{ position: "relative", padding: "8px" }}>
                  <div style={{ width: "62px", height: "62px", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", font: "var(--fw-extra) 24px/1 var(--font-sans)", color: "var(--color-primary)", background: "var(--color-primary-subtle)" }}>
                    {s.step}
                  </div>
                  <h3 style={{ font: "var(--fw-bold) 1.2rem/1.3 var(--font-display)", color: "var(--text-strong)" }}>{s.title}</h3>
                  <p style={{ marginTop: "10px", font: "var(--fw-regular) 0.95rem/1.6 var(--font-sans)", color: "var(--text-muted)" }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ paddingBlock: "var(--section-y)", background: "var(--surface-subtle)", borderBlock: "1px solid var(--border-subtle)" }}>
          <div className="fk-container">
            <SectionHeader
              eyebrow="Тарифы"
              title={
                <>
                  Понятная разница:
                  <br />
                  попробовать → маркетинг → команда
                </>
              }
              description="Бесплатный — статика. Про — динамика и аналитика. Бизнес — команда и API."
            />
            <div
              className="qrs-price-grid"
              style={{
                marginTop: "48px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "24px",
                alignItems: "start",
              }}
            >
              {plans.map((plan) => {
                const highlighted = plan.highlighted;
                const features =
                  plan.id === "FREE"
                    ? ["До 10 статических QR", "Попробовать сервис без карты", "Экспорт PNG и SVG", "1 пользователь"]
                    : plan.id === "PRO"
                      ? ["Неограниченные QR", "Динамика: смена ссылки без перепечатки", "Аналитика сканов, гео, устройства", "Пароль, срок, пиксели, A/B", "Экспорт PNG, SVG, PDF, EPS", "До 5 пользователей"]
                      : ["Всё из тарифа Про", "Неограниченные пользователи", "API-доступ", "Для агентств и сетей", "Белая метка (White Label)"];

                return (
                  <div
                    key={plan.id}
                    style={{
                      position: "relative",
                      background: highlighted ? "var(--color-primary)" : "var(--surface-card)",
                      border: `1px solid ${highlighted ? "var(--color-primary)" : "var(--border-default)"}`,
                      borderRadius: "16px",
                      boxShadow: highlighted ? "var(--shadow-lg)" : "var(--shadow-sm)",
                      color: highlighted ? "#fff" : undefined,
                      padding: "30px",
                    }}
                  >
                    {highlighted && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-13px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          padding: "5px 14px",
                          borderRadius: "999px",
                          background: "var(--color-accent)",
                          color: "#fff",
                          font: "var(--fw-bold) 11px/1 var(--font-sans)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ПОПУЛЯРНЫЙ
                      </span>
                    )}
                    <div style={{ font: "var(--fw-bold) 1.15rem/1.2 var(--font-display)", color: highlighted ? "#fff" : "var(--text-strong)" }}>
                      {plan.name}
                    </div>
                    <div style={{ marginTop: "6px", minHeight: "38px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: highlighted ? "rgba(255,255,255,0.82)" : "var(--text-muted)" }}>
                      {plan.description}
                    </div>
                    <div style={{ marginTop: "18px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span className="tnum" style={{ font: "var(--fw-extra) 2.6rem/1 var(--font-display)", color: highlighted ? "#fff" : "var(--text-strong)" }}>
                        {plan.price}
                      </span>
                      <span style={{ font: "var(--fw-medium) 14px/1 var(--font-sans)", color: highlighted ? "rgba(255,255,255,0.82)" : "var(--text-muted)" }}>
                        ₽/мес
                      </span>
                    </div>
                    <div style={{ margin: "24px 0" }}>
                      <Button
                        href={session ? "/dashboard/billing" : plan.href}
                        variant={highlighted ? "accent" : plan.id === "FREE" ? "secondary" : "primary"}
                        size="md"
                        block
                        style={highlighted ? undefined : undefined}
                      >
                        {plan.cta}
                      </Button>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                      {features.map((f) => (
                        <li key={f} className="flex gap-2.5" style={{ font: "var(--fw-regular) 14px/1.4 var(--font-sans)", color: highlighted ? "#fff" : "var(--text-default)" }}>
                          <CheckIcon color={highlighted ? "#fff" : "var(--color-success)"} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="reviews" className="fk-section">
          <div className="fk-container">
            <SectionHeader eyebrow="Сценарии" title="Как это выглядит на практике" description="Типовые сценарии без выдуманных логотипов — честная упаковка ценности." />
            <div
              className="qrs-grid-3"
              style={{
                marginTop: "44px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "24px",
              }}
            >
              {testimonials.map((t) => (
                <figure key={t.name} style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "12px", padding: "26px", margin: 0 }}>
                  <blockquote style={{ font: "var(--fw-regular) 15px/1.65 var(--font-sans)", color: "var(--text-default)", margin: 0 }}>
                    {t.text}
                  </blockquote>
                  <figcaption style={{ marginTop: "18px", font: "var(--fw-bold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
                    {t.name}
                    <div style={{ font: "var(--fw-regular) 13px/1.3 var(--font-sans)", color: "var(--text-muted)", marginTop: "2px" }}>{t.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ paddingBlock: "var(--section-y)", background: "var(--surface-subtle)", borderBlock: "1px solid var(--border-subtle)" }}>
          <div className="fk-container" style={{ maxWidth: "820px" }}>
            <SectionHeader eyebrow="FAQ" title="Частые вопросы" />
            <div style={{ marginTop: "40px" }}>
              <FaqAccordion items={faqs} />
            </div>
          </div>
        </section>

        {/* Blog */}
        <section id="blog" className="fk-section">
          <div className="fk-container">
            <div style={{ position: "relative", marginBottom: "40px" }}>
              <SectionHeader eyebrow="Блог" title="Полезные материалы" description="О QR-кодах, маркетинге и аналитике." />
              <Link href="/blog" className="qrs-navlink qrs-section-link">
                Все статьи →
              </Link>
            </div>
            {latestPosts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl" style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-muted)" }}>
                Пока нет опубликованных статей. Следите за обновлениями!
              </div>
            ) : (
              <div
                className="qrs-grid-3"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "24px",
                }}
              >
                {latestPosts.slice(0, 3).map((post, index) => {
                  const meta = getBlogCardMeta(post.category?.slug, index);
                  return (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="qrs-card-lift"
                      style={{
                        display: "block",
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div className="relative" style={{ height: "152px", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {post.coverImageUrl ? (
                          <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="(max-width:760px) 100vw, 33vw" />
                        ) : (
                          <BlogCardIcon type={meta.icon} color={meta.color} />
                        )}
                      </div>
                      <div style={{ padding: "22px" }}>
                        <span style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: meta.color }}>
                          {post.category?.name ?? "Статья"}
                        </span>
                        <h3 style={{ marginTop: "10px", font: "var(--fw-bold) 1.1rem/1.35 var(--font-display)", color: "var(--text-strong)" }}>
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p style={{ marginTop: "8px", font: "var(--fw-regular) 0.9rem/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "4px 0 var(--section-y)" }}>
          <div className="fk-container">
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "24px",
                background: "linear-gradient(135deg, var(--blue-700), var(--color-primary) 60%, var(--blue-500))",
                padding: "clamp(40px, 7vw, 72px) clamp(24px, 5vw, 64px)",
                textAlign: "center",
              }}
            >
              <div style={{ position: "absolute", inset: "auto -60px -80px auto", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.35), transparent 65%)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ font: "var(--fw-extra) clamp(1.8rem, 4vw, 2.6rem)/1.15 var(--font-display)", color: "#fff", letterSpacing: "-0.02em" }}>
                  Готовы создать первый QR-код?
                </h2>
                <p style={{ margin: "14px auto 0", maxWidth: "34em", font: "var(--fw-regular) 1.1rem/1.6 var(--font-sans)", color: "rgba(255,255,255,0.85)" }}>
                  Регистрация занимает 30 секунд. Кредитная карта не нужна.
                </p>
                <div style={{ marginTop: "30px", display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
                  <Button href={session ? "/dashboard/create" : "/register"} variant="accent" size="lg">
                    Начать бесплатно
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Button>
                  <Link
                    href="#pricing"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "52px",
                      padding: "0 24px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.4)",
                      color: "#fff",
                      font: "var(--fw-semibold) 15px/1 var(--font-sans)",
                    }}
                  >
                    Смотреть тарифы
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter session={session} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
