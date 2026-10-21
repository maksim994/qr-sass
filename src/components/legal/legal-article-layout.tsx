import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumb, PublicPageHeading } from "@/components/public/page-heading";
import s from "./legal-article-layout.module.css";

type ContentsItem = { id: string; title: string };
type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
  eyebrow: string;
  title: string;
  updatedLabel?: string;
  contents?: readonly ContentsItem[];
  children: ReactNode;
};
function Contents({ items }: { items: readonly ContentsItem[] }) {
  return <ol>{items.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol>;
}
export function LegalArticleLayout({ session, isAdmin = false, title, updatedLabel, contents = [], children }: Props) {
  return <div className="qrs-public">
    <SiteHeader session={session} isAdmin={isAdmin} />
    <main className={`fk-container ${s.page}`}>
      <PublicBreadcrumb current={title} />
      <PublicPageHeading title={title}>{updatedLabel && <p className={s.updated}>{updatedLabel}</p>}</PublicPageHeading>
      <div className={s.columns}>
        <aside className={s.sidebar}>
          {contents.length > 0 && <>
            <nav className={s.desktopContents} aria-label="Содержание документа"><h2>В этом документе</h2><Contents items={contents} /></nav>
            <details className={s.mobileContents}><summary>Содержание документа</summary><nav aria-label="Содержание документа"><Contents items={contents} /></nav></details>
          </>}
          <nav className={s.documents} aria-label="Документы сервиса">
            <Link href="/privacy-policy">Конфиденциальность</Link>
            <Link href="/terms-of-service">Условия сервиса</Link>
            <Link href="/personal-data-consent">Согласие на обработку данных</Link>
            <Link href="/qr-lifetime">Срок работы QR</Link>
            <Link href="/contacts">Контакты и реквизиты</Link>
          </nav>
        </aside>
        <article className={`qrs-body ${s.article}`}>{children}</article>
      </div>
      <div className={s.back}><Link href="/">← На главную</Link></div>
    </main>
    <SiteFooter session={session} />
  </div>;
}
