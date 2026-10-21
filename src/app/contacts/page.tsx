// Read: extend the existing Manrope/fk legal pages with a plain contact directory.
// Seller identity first, direct contact second, payment and legal links last.
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_OPERATOR } from "@/lib/legal-documents";
import { publicSiteUrl } from "@/lib/public-url";
import { serializeArticleJsonLd } from "@/lib/blog-structured-data";
import styles from "./contacts.module.css";

export const metadata: Metadata = {
  title: "Контакты и реквизиты | QR-S",
  description: "Контакты продавца QR-S: email, телефон, Telegram, реквизиты и способы оплаты.",
  alternates: { canonical: publicSiteUrl("/contacts") },
};
export default async function ContactsPage() {
  const session = await getSession();
  const settings = await getDb().siteSettings.findUnique({ where: { id: "default" } });
  const seller = {
    name: settings?.requisitesName || LEGAL_OPERATOR.name,
    inn: settings?.requisitesInn || LEGAL_OPERATOR.inn,
    email: settings?.contactEmail || LEGAL_OPERATOR.email,
    phone: settings?.contactPhone || LEGAL_OPERATOR.phone,
  };
  const phoneHref = `tel:${seller.phone.replace(/[^+\d]/g, "")}`;
  const person = { "@context": "https://schema.org", "@type": "Person", "@id": publicSiteUrl("/contacts#seller"),
    name: seller.name, taxID: seller.inn, email: seller.email, telephone: seller.phone,
    address: { "@type": "PostalAddress", addressLocality: LEGAL_OPERATOR.city, addressCountry: "RU" },
    url: publicSiteUrl("/contacts"), sameAs: ["https://t.me/m_mvmolkov"] };
  return <>
    <SiteHeader session={session} />
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeArticleJsonLd(person) }} />
      <h1>Контакты и реквизиты</h1>
      <p className={styles.intro}>Вопросы о QR-кодах, доступе или оплате — напишите удобным способом.</p>
      <section aria-labelledby="seller-title">
        <h2 id="seller-title">Продавец</h2>
        <dl className={styles.details}>
          <div><dt>ФИО</dt><dd>{seller.name}</dd></div>
          <div><dt>Статус</dt><dd>{LEGAL_OPERATOR.status}</dd></div>
          <div><dt>ИНН</dt><dd>{seller.inn}</dd></div>
          <div><dt>Город</dt><dd>{LEGAL_OPERATOR.city}</dd></div>
        </dl>
      </section>
      <section aria-labelledby="contact-title">
        <h2 id="contact-title">Связаться</h2>
        <dl className={styles.details}>
          <div><dt>Email</dt><dd><a href={`mailto:${seller.email}`}>{seller.email}</a></dd></div>
          <div><dt>Телефон</dt><dd><a href={phoneHref}>{seller.phone}</a></dd></div>
          <div><dt>Telegram</dt><dd><a href="https://t.me/m_mvmolkov" target="_blank" rel="noopener noreferrer">@m_mvmolkov<span className="sr-only"> — откроется в новой вкладке</span></a></dd></div>
        </dl>
      </section>
      <section aria-labelledby="payment-title">
        <h2 id="payment-title">Как оплатить</h2>
        <p>Выберите тариф на <Link href="/pricing">странице тарифов</Link> и оплатите его через Робокассу. Доступ включится после подтверждения оплаты. Автоматических повторных списаний нет.</p>
        <p>Сейчас принимаем оплату от физических лиц. Если нужна оплата от компании или ИП, напишите на email.</p>
        <p>Условия оплаты и возврата — в <Link href="/terms-of-service">публичной оферте</Link>. Обработка данных описана в <Link href="/privacy-policy">политике конфиденциальности</Link>.</p>
      </section>
    </main>
    <SiteFooter session={session} />
  </>;
}
