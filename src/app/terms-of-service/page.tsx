import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_SECTIONS, LEGAL_VERSION, LEGAL_DATE_LABEL } from "@/lib/legal-documents";
import { publicSiteUrl } from "@/lib/public-url";

export const metadata: Metadata = {
  title: "Публичная оферта и пользовательское соглашение", description: "Публичная оферта QR-S.ru: услуги, принятие условий, оплата, сроки доступа, возврат и реквизиты исполнителя.",
  alternates: { canonical: publicSiteUrl("/terms-of-service") },
};
export default async function Page() {
  return <LegalArticleLayout session={await getSession()} eyebrow="Правовая информация" title="Публичная оферта и пользовательское соглашение"
    updatedLabel={`Редакция ${LEGAL_VERSION} от ${LEGAL_DATE_LABEL}`}>
    <p><a href="/documents/oferta-qr-s-2026-10-06.docx" download className="underline underline-offset-4">Скачать публичную оферту в Word</a></p>
    <LegalDocument sections={TERMS_SECTIONS} />
    <p><Link href="/privacy-policy">Политика конфиденциальности</Link> · <Link href="/personal-data-consent">Согласие на обработку данных</Link> · <Link href="/qr-lifetime">Срок жизни QR</Link></p>
  </LegalArticleLayout>;
}
