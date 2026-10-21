import { LEGAL_OPERATOR, type LegalSection } from "@/lib/legal-documents";

// Existing public anchors (payment/refund/cookie-settings) take precedence.
const sectionId = (section: LegalSection, index: number) => section.id ?? `section-${index + 1}`;
export function legalContents(sections: readonly LegalSection[]) {
  return [...sections.map((section, index) => ({ id: sectionId(section, index), title: section.title })), { id: "requisites", title: "Реквизиты и контакты исполнителя" }];
}
export function LegalDocument({ sections }: { sections: readonly LegalSection[] }) {
  return <>{sections.map((section, index) => <section id={sectionId(section, index)} key={section.title}>
    <h2>{section.title}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}
  </section>)}<h2 id="requisites">Реквизиты и контакты исполнителя</h2><p>{LEGAL_OPERATOR.name}<br />{LEGAL_OPERATOR.status}<br />Город: {LEGAL_OPERATOR.city}<br />ИНН: {LEGAL_OPERATOR.inn}<br />
    <a href={`mailto:${LEGAL_OPERATOR.email}`}>{LEGAL_OPERATOR.email}</a><br />
    <a href={`tel:${LEGAL_OPERATOR.phone.replace(/[^+\d]/g, "")}`}>{LEGAL_OPERATOR.phone}</a></p></>;
}
