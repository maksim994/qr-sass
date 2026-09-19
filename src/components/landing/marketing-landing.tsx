import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import { CreateUrlStartForm } from "@/components/landing/create-url-start-form";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSeoPages, type SeoPage } from "@/lib/seo-content";
import { landingDetails } from "@/lib/landing-details";
import { landingStructuredData } from "@/lib/landing-seo";
import { jsonForHtmlScript } from "@/lib/html-script";
import { publicSiteUrl } from "@/lib/public-url";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";
import type { ScenarioLanding } from "@/lib/scenario-landings";
import s from "./marketing-landing.module.css";

/** Extends the approved homepage: Manrope, blue actions, open sections and a tangible QR example.
 * Visitor path: understand this use case, review its limits, create a QR. Examples are labelled.
 * The first viewport pairs a large task-specific heading and CTA with a printable QR and its destination.
 */
export async function MarketingLanding({ page, scenario }: { page: SeoPage; scenario?: ScenarioLanding }) {
  const session = await getSession();
  const detail = landingDetails[page.slug];
  let isAdmin = false;
  if (session?.sub) {
    try {
      const user = await getDb().user.findUnique({ where: { id: session.sub }, select: { isAdmin: true } });
      isAdmin = Boolean(user?.isAdmin);
    } catch { /* The public page remains available without optional account details. */ }
  }
  const signedIn = Boolean(session);
  const actionHref = scenario ? "#create" : signedIn ? detail.next : `/register?next=${encodeURIComponent(detail.next)}`;
  const secondaryHref = scenario ? (signedIn ? scenario.secondary.signedInHref : scenario.secondary.guestHref) : undefined;
  return (
    <div className={s.page}>
      <a className={s.skip} href="#landing-main">Перейти к содержимому</a>
      <SiteHeader session={session} isAdmin={isAdmin} minimal />
      <main id="landing-main" tabIndex={-1}>
        <nav className={`${s.container} ${s.breadcrumb}`} aria-label="Хлебные крошки">
          <ol><li><Link href="/">Главная</Link></li><li aria-current="page">{detail.label}</li></ol>
        </nav>
        <section className={`${s.container} ${s.hero}`} aria-labelledby="landing-title">
          <div className={s.heroCopy}>
            <h1 id="landing-title">{detail.headline}</h1>
            <p>{scenario?.lead ?? page.description}</p>
            <div className={s.actions}>
              <Button href={actionHref} size="lg">{page.cta}<span aria-hidden="true">↗</span></Button>
              <a href="#how-it-works" className={s.textLink}>Как это работает <span aria-hidden="true">↓</span></a>
            </div>
            <p className={s.note}>Статические QR — бесплатно. Динамические — на платном тарифе или в пробном периоде.</p>
          </div>
          <figure className={s.demo}>
            <div className={s.demoTop}><span>{detail.label}</span><span>Пример применения</span></div>
            <div className={s.demoFlow}>
              <div className={s.print}><span>Откройте камерой</span><HomeQrPreview value={publicSiteUrl(`/${page.slug}`)} /><strong>{detail.label}</strong><span>QR-S.ru</span></div>
              <span className={s.flowArrow} aria-hidden="true">↗</span>
              <div className={s.destination}><span className={s.browserBar} aria-hidden="true">qr-s.ru · пример</span><strong>{detail.exampleTitle}</strong><ul>{detail.exampleRows.map(row => <li key={row}>{row}</li>)}</ul><span className={s.destinationCaption}>{detail.destination}</span></div>
            </div>
            <figcaption>Иллюстрация сценария. Этот QR открывает текущую страницу.</figcaption>
          </figure>
        </section>
        <section className={`${s.container} ${s.benefits}`} aria-labelledby="benefits-title">
          <h2 id="benefits-title">{page.heading}</h2>
          <ul>{page.bullets.map(bullet => <li key={bullet}><span aria-hidden="true">↗</span>{bullet}</li>)}</ul>
        </section>
        {scenario && <section id="create" className={`${s.container} ${s.create}`} aria-labelledby="create-title">
          <div><h2 id="create-title">Начните<br />с вашей ссылки.</h2><p>Добавьте адрес страницы, которую откроет посетитель. Выбор и ссылка сохранятся при переходе к регистрации.</p></div>
          <div className={s.form}><CreateUrlStartForm signedIn={signedIn} placeholder={scenario.placeholder} defaultKind={scenario.defaultKind} hint={scenario.hint} submitLabel={scenario.submitLabel} formId={`${page.slug}-start`} /><Link className={s.textLink} href={secondaryHref!}>{scenario.secondary.label} <span aria-hidden="true">↗</span></Link></div>
        </section>}
        <section id="how-it-works" className={`${s.container} ${s.how}`} aria-labelledby="how-title">
          <div className={s.sectionHeading}><h2 id="how-title">От идеи<br />до первого открытия.</h2><p>Три шага для сценария «{detail.label}».</p></div>
          <ol className={s.steps}>{detail.steps.map((step, index) => <li key={step.title}><span className={s.stepNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        </section>
        <section className={s.terms} aria-labelledby="terms-title"><div className={`${s.container} ${s.termsInner}`}>
          <div><h2 id="terms-title">Печатайте надолго.<br />Учитывайте условия.</h2><Link href="/#pricing" className={s.textLink}>Сравнить тарифы <span aria-hidden="true">↗</span></Link></div>
          <div>{scenario ? <ul>{scenario.limits.map(item => <li key={item}>{item}</li>)}</ul> : <p>Бесплатный тариф подходит для статических QR. Смена назначения и аналитика требуют динамического кода и соответствующего тарифа. Возможности команды, массового создания и API зависят от плана.</p>}<p>{QR_LIFETIME.billing}</p><Link href={QR_LIFETIME_PATH} className={s.textLink}>Как долго работает напечатанный QR <span aria-hidden="true">↗</span></Link></div>
        </div></section>
        <section className={`${s.container} ${s.faq}`} aria-labelledby="faq-title"><div><h2 id="faq-title">Вопросы<br />перед стартом.</h2><p>О возможностях и ограничениях<br />без мелкого шрифта.</p></div><div>{detail.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>
        <nav className={`${s.container} ${s.related}`} aria-label="Другие сценарии QR"><h2>Ещё задачи для вашего QR.</h2><div>{getSeoPages().filter(item => item.slug !== page.slug).map(item => <Link href={`/${item.slug}`} key={item.slug}>{landingDetails[item.slug].label}<span aria-hidden="true">↗</span></Link>)}</div></nav>
        <section className={`${s.container} ${s.closing}`} aria-labelledby="closing-title"><div><h2 id="closing-title">Теперь — ваш QR.</h2><p>Выберите содержимое, настройте оформление и проверьте перед печатью.</p></div><Button href={actionHref} size="lg">{page.cta}<span aria-hidden="true">↗</span></Button></section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForHtmlScript(landingStructuredData(page, detail.label)) }} />
      </main>
      <SiteFooter session={session} />
    </div>
  );
}
