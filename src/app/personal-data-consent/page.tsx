import { applySeoOverridesToMetadata, getSeoPageHeading } from "@/lib/seo-page-overrides";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { LegalDocument, legalContents } from "@/components/legal/legal-document";
import { CONSENT_SECTIONS, LEGAL_VERSION, LEGAL_DATE_LABEL } from "@/lib/legal-documents";
import { publicSiteUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

const defaultMetadata: Metadata = {
  title: "Согласие на обработку персональных данных", description: "Согласие на обработку персональных данных QR-S.ru: условия, права пользователя и контакты оператора.",
  alternates: { canonical: publicSiteUrl("/personal-data-consent") },
};

export async function generateMetadata(): Promise<Metadata> {
  return applySeoOverridesToMetadata("/personal-data-consent", defaultMetadata);
}
export default async function Page() {
  const seoHeading = await getSeoPageHeading("/personal-data-consent", "Согласие на обработку персональных данных");
  return <LegalArticleLayout contents={legalContents(CONSENT_SECTIONS)} session={await getSession()} eyebrow="Правовая информация" title={seoHeading}
    updatedLabel={`Редакция ${LEGAL_VERSION} от ${LEGAL_DATE_LABEL}`}>
    <LegalDocument sections={CONSENT_SECTIONS} />
    <p><Link href="/privacy-policy">Политика конфиденциальности</Link> · <Link href="/personal-data-consent">Согласие на обработку данных</Link> · <Link href="/terms-of-service">Условия сервиса</Link> · <Link href="/qr-lifetime">Срок жизни QR</Link></p>
  </LegalArticleLayout>;
}
