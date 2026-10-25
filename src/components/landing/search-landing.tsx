import Link from "next/link";
import Image from "next/image";
import { publicGeneratorOptions } from "@/lib/public-generator";
import { getPlan } from "@/lib/plans";
import { COMMERCIAL, PRINTED_QR_COPY, rubles } from "@/lib/commercial-config";
import { BITRIX_LANDING_SLUG, BITRIX_MARKETPLACE_MODULE_URL } from "@/lib/bitrix-module-landing";
import { landingDetails } from "@/lib/landing-details";
import { getSeoPage } from "@/lib/seo-content";
import { searchLandings, type SearchLanding as LandingData } from "@/lib/search-landings";
import { landingStructuredData } from "@/lib/landing-seo";
import { jsonForHtmlScript } from "@/lib/html-script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { HomeQuickStart } from "./home-quick-start";
import s from "./search-landing.module.css";

function relatedLanding(slug: string): { label: string } | null {
  const search = searchLandings.find((item) => item.slug === slug);
  if (search) return { label: search.label };
  const seo = getSeoPage(slug);
  if (seo) return { label: landingDetails[slug]?.label ?? seo.heading };
  return null;
}

export async function SearchLanding({page}: {page:LandingData}) {
  const [options,pro]=await Promise.all([publicGeneratorOptions(),getPlan("PRO")]);
  const {session,enabledStaticTypes,enabledTypes,dynamicRemaining,trialUsed}=options;
  const hostedHref=(type:string)=>session?`/dashboard/create/${type}`:`/register?next=${encodeURIComponent(`/dashboard/create/${type}`)}`;
  const guideType=page.type === "WIFI" ? "wifi" : page.type === "VCARD" ? "vcard" : "link";
  const structured=landingStructuredData({...page, keywords:[]},page.label,page.faqs);
  return <div className={`qrs-public ${s.page}`}>
    <SiteHeader session={session} minimal createHref={page.skipGenerator ? "/#create-qr" : "#create-qr"} />
    <main className={s.main}>
      <nav className={s.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><span aria-current="page">{page.label}</span></nav>
      <header className={s.intro}><h1>{page.heading}</h1><p>{page.description}</p></header>
      {!page.skipGenerator && <section id="create-qr" className={s.generator} aria-label={`Генератор: ${page.label}`}>
        {page.hosted && <div className={s.hosted}><div><strong>{page.hosted.label}</strong><p>{page.hosted.text}</p></div><Button href={hostedHref(page.hosted.type)} variant="secondary">{page.hosted.label}<span aria-hidden="true">→</span></Button></div>}
        <HomeQuickStart printA6={page.slug.startsWith("qr-dlya-otzyvov")} heading={false} source="landing" initialType={enabledStaticTypes.includes(page.type)?page.type:enabledStaticTypes[0]} signedIn={!!session} enabledStaticTypes={enabledStaticTypes} enabledTypes={enabledTypes} dynamicRemaining={dynamicRemaining} trialUsed={trialUsed} inputMode={page.inputMode} urlLabel={page.inputLabel} urlPlaceholder={page.placeholder} initialFrameText={page.frame} />
        {page.slug === "qr-menu" && <p className={s.inlineLink}><Link href={hostedHref("menu")}>Создать страницу с типом «Меню» в кабинете →</Link></p>}
        {page.slug === "kak-izmenit-ssylku-v-qr-posle-pechati" && <p className={s.inlineLink}><Link href="/dynamic-qr">Создать динамический QR →</Link> · <Link href="/pricing">Сравнить тарифы, включая Про →</Link></p>}
      </section>}
      {page.skipGenerator && page.slug === BITRIX_LANDING_SLUG && <section className={s.textSection} aria-label="Действия"><p><a href={BITRIX_MARKETPLACE_MODULE_URL}>Карточка модуля на Marketplace 1С-Битрикс</a> · <Link href="/dynamic-qr">Динамические QR в кабинете</Link></p></section>}
      <section className={`${s.how}${page.stepsTextOnly ? ` ${s.howTextOnly}` : ""}`} aria-labelledby="how-title"><h2 id="how-title">Как создать и проверить код</h2><ol>{page.steps.map(([title,text],index)=><li key={title}><div><h3>{title}</h3><p>{text}</p></div>{!page.stepsTextOnly && <figure><Image src={`/images/guides/${index===0?guideType:index===1?"design":"download"}.webp`} alt={index===0?`Поля генератора: ${page.label}`:index===1?"Выбор цвета и рамки QR-кода":"Предпросмотр QR и кнопки скачивания PNG и SVG"} width={720} height={480} sizes="(max-width:800px) 100vw, 400px" /><figcaption>Генератор QR-S · {index===0?"содержимое":index===1?"оформление":"скачивание"}</figcaption></figure>}</li>)}</ol></section>
      {page.sections.map(section=><section className={s.textSection} key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}
      {page.slug === "qr-dlya-otzyvov-yandex-karty" && <section className={s.textSection}><h2>Сравните варианты перед печатью</h2><div className={s.tableWrap}><table><thead><tr><th scope="col">Задача</th><th scope="col">Яндекс Бизнес</th><th scope="col">QR-S</th></tr></thead><tbody><tr><th scope="row">QR на карточку и отзывы</th><td>Есть в промоматериалах</td><td>Создаётся из вашей ссылки</td></tr><tr><th scope="row">Свой макет</th><td>Промоматериалы Яндекса</td><td>Цвет, рамка, PNG и SVG</td></tr><tr><th scope="row">Изменение назначения</th><td>Ссылка исходного QR на организацию</td><td>В кабинете у динамического кода</td></tr><tr><th scope="row">Подсчёт открытий QR</th><td>Возможности площадки уточняйте в Яндексе</td><td>По дням и устройствам у динамического кода</td></tr><tr><th scope="row">Яндекс и 2ГИС на выбор</th><td>QR ведёт в Яндекс</td><td>Нужна ваша страница с двумя ссылками</td></tr></tbody></table></div></section>}
      <section className={s.choice}><h2>Статический или динамический?</h2><div><article><h3>Статический</h3><p>{page.staticCopy}</p></article><article><h3>Динамический</h3><p>{page.dynamicCopy}</p></article></div>{["qr-dlya-vizitki", "qr-po-ssylke", "qr-menu"].includes(page.slug) && <p><Link href="/blog/dinamicheskij-i-staticheskij-qr-kod-raznica">Чем отличаются статический и динамический QR-код</Link></p>}<p className={s.note}>{COMMERCIAL.free.dynamic} динамических кода бесплатно. Про — {rubles(pro.priceRub)} в месяц, {COMMERCIAL.trialDays} дней без карты. <Link href="/pricing">Сравнить тарифы</Link>.</p></section>
      <section className={s.textSection}><h2>Подготовьте QR к печати</h2><p>Оставьте чистое поле минимум в четыре модуля, обеспечьте контраст и не растягивайте код. Для визитки начните с 20–25 мм, для настольной таблички A6 — с 30–40 мм; итог зависит от плотности кода и расстояния. Эти размеры — ориентир для пробной печати.</p><p><Link href="/blog/razmer-qr-koda-dlya-pechati">{["qr-dlya-vizitki", "qr-po-ssylke"].includes(page.slug) ? "Минимальный размер QR-кода для печати →" : "Таблица размеров QR для печати →"}</Link></p><p>{PRINTED_QR_COPY} <Link href="/qr-lifetime">Срок работы QR и условия доступа</Link>.</p></section>
      <section className={s.faq}><h2>{page.faqSectionTitle ?? "Частые вопросы"}</h2><div>{page.faqs.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      <nav className={s.links} aria-label="Статьи по теме"><h2>Подробнее по теме</h2>{page.articles.map(([slug,label])=><Link key={slug} href={`/blog/${slug}`}>{label}<span aria-hidden="true">→</span></Link>)}{page.source&&<a href={page.source.url}>{page.source.label}<span aria-hidden="true">↗</span></a>}</nav>
      <nav className={s.links} aria-label="Другие генераторы"><h2>Другие задачи для QR</h2>{page.related.map((slug) => { const related = relatedLanding(slug); return related && <Link key={slug} href={`/${slug}`}>{related.label}<span aria-hidden="true">→</span></Link>; })}</nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtmlScript(structured)}} />
    </main><SiteFooter session={session}/>
  </div>;
}
