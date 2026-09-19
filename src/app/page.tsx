import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPlan, type PlanInfo } from "@/lib/plans";
import { qrTypes } from "@/lib/qr-types";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";
import { getDisabledQrTypes } from "@/lib/disabled-qr-types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { HomeQuickStart } from "@/components/landing/home-quick-start";
import { HomeHero, IndustryShowcase, TypeExplorer, DynamicDemo, DesignPlayground, AnalyticsDemo, HomeFooterExperience } from "@/components/landing/home-experience";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import { publicSiteUrl } from "@/lib/public-url";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const baseUrl = publicSiteUrl();
export const metadata: Metadata = {
  title: "Создать QR-код онлайн — генератор QR-S.ru",
  description: "Создавайте QR-коды для ссылок, меню и файлов. Настройте оформление, скачайте PNG или SVG. Динамические QR позволяют менять ссылку после печати.",
  keywords: ["генератор qr кодов", "создать qr код", "динамический qr код", "qr код онлайн"],
  alternates: { canonical: baseUrl },
  openGraph: {
    title: "Ваша ссылка. Ваш QR-код. — QR-S.ru",
    description: "QR-коды для сайта, меню и печатных материалов. Создавайте, делитесь и управляйте ссылками в одном кабинете.",
    url: baseUrl,
  },
};

const faqs = [
  { question: "Можно создать QR-код бесплатно?", answer: "Да. Бесплатный тариф позволяет создавать статические QR-коды и скачивать их в доступных форматах. Лимит кодов и форматы указаны в тарифах выше. Для сохранения кода нужен аккаунт." },
  { question: "Чем обычный QR отличается от динамического?", answer: "Обычный, или статический, QR содержит вашу ссылку напрямую — изменить её после печати нельзя. Динамический QR ведёт через короткую ссылку QR-S.ru: её назначение можно менять в кабинете на платном тарифе." },
  { question: "Что будет с кодом после окончания тарифа?", answer: QR_LIFETIME.billing },
  { question: "Подойдёт ли QR для печати?", answer: "Да. SVG сохраняет чёткость при масштабировании, PNG подходит для готовых макетов. Оставьте свободное поле вокруг кода и проверьте его камерой телефона перед тиражом. На платных тарифах доступны дополнительные форматы; PDF и EPS содержат растровое изображение." },
  { question: "Какую статистику можно посмотреть?", answer: "Для динамических QR на тарифе с аналитикой доступны открытия по дням и типу устройства. Боты учитываются отдельно. География и уникальные посетители не определяются." },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Check() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>; }

function planFeatures(plan: PlanInfo) {
  const { limits } = plan;
  return [
    limits.maxQrCodes == null ? "Без лимита на количество QR" : `До ${limits.maxQrCodes} QR-кодов`,
    limits.allowsDynamic ? "Смена ссылки после печати" : "Статические QR-коды",
    ...(limits.allowsAnalytics ? ["Статистика открытий"] : []),
    `Экспорт ${limits.exportFormats.join(", ")}`,
    limits.maxUsers === 1 ? "Для одного пользователя" : limits.maxUsers == null ? "Совместная работа команды" : `Команда до ${limits.maxUsers} человек`,
    ...(plan.id === "BUSINESS" ? ["Доступ к API"] : []),
  ];
}

export default async function HomePage() {
  const [session, free, pro, business, disabledTypes] = await Promise.all([
    getSession(), getPlan("FREE"), getPlan("PRO"), getPlan("BUSINESS"), getDisabledQrTypes(),
  ]);
  let isAdmin = false;
  let posts: { slug: string; title: string; excerpt: string | null }[] = [];
  try {
    const [user, latestPosts] = await Promise.all([
      session?.sub ? getDb().user.findUnique({ where: { id: session.sub }, select: { isAdmin: true } }) : Promise.resolve(null),
      getDb().blogPost.findMany({ where: { publishedAt: { not: null } }, orderBy: { publishedAt: "desc" }, take: 3, select: { slug: true, title: true, excerpt: true } }),
    ]);
    isAdmin = user?.isAdmin ?? false;
    posts = latestPosts.map(post => {
      const clean = sanitizeBlogFields(post);
      return { ...post, title: clean.title ?? post.title, excerpt: clean.excerpt ?? post.excerpt };
    });
  } catch { /* The generator and default plans remain available without optional content. */ }
  const enabledTypes = qrTypes.filter(type => !disabledTypes.includes(type.type));
  const otherTypes = ["WIFI", "VCARD", "PDF"].flatMap(type => enabledTypes.filter(item => item.type === type));
  const startPath = session ? "/dashboard/create" : "/register";
  const plans = [free, pro, business];
  const descriptions = { FREE: "Для первых кодов и простых задач", PRO: "Для ссылок, которые меняются", BUSINESS: "Для команды и интеграций" };
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };

  return (
    <div className={styles.home}>
      <SiteHeader session={session} isAdmin={isAdmin} minimal />
      <main>
        <HomeHero />
        <div className={`${styles.container} ${styles.valueStrip}`} aria-label="Возможности сервиса">
          <span><Check /> От ссылки до электронного меню</span><span><Check /> Дизайн под ваш бренд</span><span><Check /> Смена ссылки после печати</span><span><Check /> Статистика открытий</span>
        </div>

        <section className={`${styles.container} ${styles.section} ${styles.quickSection}`} aria-labelledby="quick-title">
          <div className={styles.quickCopy}><h2 id="quick-title">Первая идея?<br />Превратите её в QR.</h2><p>Вставьте ссылку. Вы увидите код сразу, а оформление и скачивание будут доступны на следующем шаге.</p><a href="#types" className={styles.textLink}>Или выберите другой тип <Arrow /></a></div>
          <HomeQuickStart signedIn={Boolean(session)} urlEnabled={enabledTypes.some(type => type.type === "URL")} otherTypes={otherTypes} />
        </section>

        <section className={`${styles.container} ${styles.how}`} id="how" aria-labelledby="how-title">
          <h2 id="how-title" className="sr-only">Три шага до готового QR-кода</h2>
          {[
            ["1", "Добавьте содержимое", "Ссылку на сайт, меню, файл или контакты."],
            ["2", "Настройте оформление", "Выберите цвет, добавьте логотип и рамку."],
            ["3", "Скачайте и поделитесь", "Разместите код на экране или в печатном макете."],
          ].map(([step, title, text]) => <div key={step} className={styles.step}><span>{step}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}
        </section>

        <section id="use-cases" className={`${styles.container} ${styles.section}`}>
          <div className={styles.sectionHeading}><h2>Готовые сценарии<br />для вашей отрасли</h2><p>От учебных материалов до мероприятий и услуг. <br />Найдите свою задачу — и подходящий тип QR.</p></div>
          <IndustryShowcase types={enabledTypes} signedIn={Boolean(session)} />
        </section>

        <section id="features" className={styles.featureSection}>
          <div className={`${styles.container} ${styles.featureGrid}`}>
            <div className={styles.featureCopy}><h2>Напечатайте один раз. <br />Меняйте ссылку, <br />когда нужно.</h2><p>Новый каталог, программа события или другая страница. Динамический QR остаётся прежним, а вы обновляете его назначение в кабинете.</p><ul><li><Check />Не нужно перепечатывать код</li><li><Check />Все ссылки в одном месте</li><li><Check />Статистика открытий по дням</li></ul><Link href="/dynamic-qr" className={styles.textLink}>Как работает динамический QR <span aria-hidden="true">→</span></Link><p className={styles.paidNote}>Доступно на Про · пробный период 14 дней</p></div>
            <DynamicDemo />
          </div>
        </section>

        <section id="types" className={`${styles.container} ${styles.section}`}>
          <div className={styles.sectionHeading}><h2>Не только ссылки. <br />Всё, чем вы делитесь.</h2><p>Файлы, контакты, Wi-Fi или страница компании. <br />Выберите содержимое — мы поможем упаковать его в QR.</p></div>
          <TypeExplorer types={enabledTypes} signedIn={Boolean(session)} />
        </section>

        <section className={`${styles.container} ${styles.designSection}`}>
          <DesignPlayground />
          <div className={styles.featureCopy}><h2>Узнаваемый. <br />Даже в деталях.</h2><p>Ваш код может быть частью фирменного стиля. Подберите цвет, добавьте логотип и выберите рамку в редакторе.</p><p>Попробуйте цвет и подпись в примере. Свой код вы настроите в редакторе.</p><ul><li><Check />Цвета и оформление модулей</li><li><Check />Логотип в центре QR-кода</li><li><Check />Рамка с призывом к действию</li></ul><Button href={startPath} variant="secondary">Открыть редактор <Arrow /></Button></div>
        </section>

        <section className={styles.printSection}>
          <div className={`${styles.container} ${styles.printGrid}`}>
            <div><h2>С экрана. <br />На бумагу. <br /><span>В реальный мир.</span></h2><p>Визитка, упаковка, настольная табличка или большой плакат. Скачайте QR в подходящем формате и добавьте в свой макет.</p><div className={styles.formatLabels}><span>SVG <small>Для любого размера</small></span><span>PNG <small>Для готового макета</small></span></div><p className={styles.printHint}>Перед тиражом проверьте код камерой телефона и сохраните свободное поле вокруг него.</p></div>
            <div className={styles.printArtwork} aria-label="Пример QR-кода в печатном макете"><div className={styles.printPoster}><span>ИЗ ОФЛАЙНА — В ОНЛАЙН</span><strong>У каждой<br />вещи есть<br />продолжение.</strong><HomeQrPreview value="https://qr-s.ru/qr-for-packaging" /><span>ОТКРОЙТЕ ЕГО ОДНИМ СКАНОМ ↗</span></div><div className={styles.printSticker}><HomeQrPreview value="https://qr-s.ru" /><span>Начнём<br />знакомство? ↗</span></div><span className={styles.printExample}>Примеры печатных материалов</span></div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.analyticsSection}`}>
          <div className={styles.featureCopy}><h2>Вы разместили код. <br />Его открывают?</h2><p>Для динамических QR с аналитикой смотрите открытия по дням и устройствам. Сравнивайте активность после размещения в разных материалах.</p><ul><li><Check />История открытий по дням</li><li><Check />Типы устройств посетителей</li><li><Check />Боты учитываются отдельно</li></ul><Link href="#pricing" className={styles.textLink}>Выбрать тариф с аналитикой <Arrow /></Link></div>
          <AnalyticsDemo />
        </section>

        <section className={`${styles.container} ${styles.workspaceSection}`}>
          <div className={styles.sectionHeading}><h2>Кодов становится больше. <br />Порядок остаётся.</h2><p>От одной ссылки до материалов всей команды — <br />в едином личном кабинете.</p></div>
          <div className={styles.workspaceFeatures}>
            <article><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 14h14l4 5h18v21H6V14Zm0 0V8h15l4 6h17v5" /><path d="M14 27h20m-20 6h12" /></svg><h3>Всё на своих местах</h3><p>Находите свои QR-коды, меняйте содержимое и возвращайтесь к нужным материалам.</p></article>
            <article><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="18" cy="16" r="7" /><path d="M4 40v-4a14 14 0 0 1 28 0v4M32 9a7 7 0 0 1 0 14m3 5a12 12 0 0 1 9 12" /></svg><h3>Вместе с командой</h3><p>Подключайте коллег к работе. Количество пользователей зависит от выбранного тарифа.</p></article>
            <article><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m16 13-11 11 11 11m16-22 11 11-11 11M28 7l-8 34" /></svg><h3>Ближе к вашим процессам</h3><p>Используйте API на тарифе Бизнес, чтобы связать создание QR с вашими системами.</p></article>
          </div>
        </section>

        <section id="pricing" className={`${styles.container} ${styles.section} ${styles.pricingSection}`}>
          <div className={styles.pricingHeading}><div><h2>Ваши задачи.<br />Ваш тариф.</h2><p>Начните бесплатно. Подключайте больше возможностей по мере роста.</p></div><span><Check /> Про: 14 дней без карты</span></div>
          <div className={styles.pricing}>
            {plans.map(plan => <article key={plan.id} className={`${styles.plan} ${plan.id === "PRO" ? styles.featuredPlan : ""}`}>
              <div className={styles.planName}><h3>{plan.name}</h3>{plan.id === "PRO" && <span>Для регулярной работы</span>}</div><p className={styles.planDescription}>{descriptions[plan.id]}</p>
              <p className={styles.price}>{plan.priceRub.toLocaleString("ru-RU")} <span>₽ / месяц</span></p>
              <Button href={session ? "/dashboard/billing" : plan.id === "FREE" ? "/#create-qr" : "/register"} variant={plan.id === "PRO" ? "primary" : "secondary"} block>{plan.id === "FREE" ? "Начать бесплатно" : plan.id === "PRO" ? "Попробовать 14 дней" : "Выбрать Бизнес"}</Button>
              <ul>{planFeatures(plan).map(feature => <li key={feature}><Check />{feature}</li>)}</ul>
            </article>)}
          </div>
          <div className={styles.pricingNotes}><p>Пробный период Про — 14 дней без карты. Затем можно оплатить тариф или продолжить на бесплатном.</p><p>Напечатанные динамические коды продолжают открываться после окончания тарифа. Изменение ссылок доступно при оплате. <Link href={QR_LIFETIME_PATH}>Подробнее о сроке работы QR <Arrow /></Link></p></div>
        </section>

        <section id="faq" className={`${styles.container} ${styles.faqSection}`}>
          <div><h2>Остались вопросы?</h2><p>Самое важное перед первым кодом.</p></div>
          <div className={styles.faqList}>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
        </section>

        {posts.length > 0 && <section className={`${styles.container} ${styles.articles}`}><div className={styles.sectionHeading}><h2>Идеи для ваших QR-кодов</h2><Link href="/blog" className={styles.textLink}>Все статьи <Arrow /></Link></div><div>{posts.map(post => <Link href={`/blog/${post.slug}`} key={post.slug}><h3>{post.title}</h3>{post.excerpt && <p>{post.excerpt}</p>}<span aria-hidden="true">↗</span></Link>)}</div></section>}


      </main>
      <SiteFooter session={session}><HomeFooterExperience types={enabledTypes} signedIn={Boolean(session)} /></SiteFooter>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
