import { applySeoOverridesToMetadata, getSeoPageHeading } from "@/lib/seo-page-overrides";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { LegalDocument, legalContents } from "@/components/legal/legal-document";
import { PRIVACY_SECTIONS, PRIVACY_VERSION, PRIVACY_DATE_LABEL } from "@/lib/legal-documents";
import { publicSiteUrl } from "@/lib/public-url";
import { analyticsRetentionDays } from "@/lib/analytics-retention";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

export const dynamic = "force-dynamic";

const defaultMetadata: Metadata = {
  title: "Политика конфиденциальности", description: "Политика конфиденциальности QR-S.ru: условия, права пользователя и контакты оператора.",
  alternates: { canonical: publicSiteUrl("/privacy-policy") },
};

export async function generateMetadata(): Promise<Metadata> {
  return applySeoOverridesToMetadata("/privacy-policy", defaultMetadata);
}
export default async function Page() {
  const seoHeading = await getSeoPageHeading("/privacy-policy", "Политика конфиденциальности");
  return <LegalArticleLayout contents={[...legalContents(PRIVACY_SECTIONS), { id: "cookie-settings", title: "Настройки cookie" }]} session={await getSession()} eyebrow="Правовая информация" title={seoHeading}
    updatedLabel={`Редакция ${PRIVACY_VERSION} от ${PRIVACY_DATE_LABEL}`}>
    <LegalDocument sections={PRIVACY_SECTIONS} />
    <p>Срок хранения технических полей аналитики QR: {analyticsRetentionDays()} дней.</p>
    <CookieSettingsButton />
    <p><Link href="/privacy-policy">Политика конфиденциальности</Link> · <Link href="/personal-data-consent">Согласие на обработку данных</Link> · <Link href="/terms-of-service">Условия сервиса</Link> · <Link href="/qr-lifetime">Срок жизни QR</Link></p>
  </LegalArticleLayout>;
}
