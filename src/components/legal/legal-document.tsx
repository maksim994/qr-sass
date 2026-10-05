import { LEGAL_OPERATOR, type LegalSection } from "@/lib/legal-documents";
export function LegalDocument({ sections }: { sections: readonly LegalSection[] }) {
  return <>{sections.map(section => <section id={section.id} key={section.title} style={{ scrollMarginTop: "96px" }}>
    <h2>{section.title}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}
  </section>)}<h2 id="requisites" style={{ scrollMarginTop: "96px" }}>Реквизиты и контакты исполнителя</h2><p>{LEGAL_OPERATOR.name}<br />{LEGAL_OPERATOR.status}<br />Город: {LEGAL_OPERATOR.city}<br />ИНН: {LEGAL_OPERATOR.inn}<br />
    <a href={`mailto:${LEGAL_OPERATOR.email}`}>{LEGAL_OPERATOR.email}</a><br />
    <a href={`tel:${LEGAL_OPERATOR.phone.replace(/[^+\d]/g, "")}`}>{LEGAL_OPERATOR.phone}</a></p></>;
}
