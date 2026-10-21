import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { COMMERCIAL, PRINTED_QR_COPY, rubles } from "@/lib/commercial-config";
import { publicSiteUrl } from "@/lib/public-url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { PricingPageGoal } from "@/components/landing/page-goal";
import { PublicBreadcrumb, PublicPageHeading } from "@/components/public/page-heading";
import s from "./pricing.module.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const pro = await getPlan("PRO");
  const title = `Тарифы QR-S: динамические QR-коды от ${rubles(pro.priceRub)} в месяц`;
  return { title, description: `Статические QR и ${COMMERCIAL.free.dynamic} динамических бесплатно. Про — ${rubles(pro.priceRub)} в месяц, ${COMMERCIAL.trialDays} дней без карты. Сравните тарифы и возможности.`, alternates: { canonical: publicSiteUrl("/pricing") }, openGraph: { type: "website", title, url: publicSiteUrl("/pricing"), images: [publicSiteUrl("/opengraph-image.png")] } };
}
export default async function PricingPage() {
  const [session, free, pro, business] = await Promise.all([getSession(), getPlan("FREE"), getPlan("PRO"), getPlan("BUSINESS")]);
  const plans = [free, pro, business];
  const faqs = [
    ["Что будет с кодами после окончания тарифа?", PRINTED_QR_COPY],
    ["Как работает пробный период?", `Про доступен ${COMMERCIAL.trialDays} дней, без карты. Включите его в разделе оплаты. Пробный период предоставляется один раз; прежние даты окончания сохраняются.`],
    ["Есть ли автоматические списания?", "Нет. Продление вручную, каждый платёж подтверждаете вы."],
    ["Как получить чек?", "Robokassa выдаёт чек после успешной оплаты. Если он не пришёл, обратитесь в поддержку с номером заказа из истории платежей."],
    ["Можно ли сменить тариф?", "Да, в разделе оплаты. Архивные условия сохраняются до явного выбора новых условий. История платежей и существующие QR не меняются."],
    ["Можно ли оплатить от юридического лица?", "Отдельная оплата по счёту для юридических лиц сейчас не предусмотрена. Оплата проходит через Robokassa."],
  ];
  const rows: [string, ...string[]][] = [
    ["Статические QR без сохранения", ...plans.map(() => "Без лимита")],
    ["Динамические QR", ...plans.map(p => p.limits.maxDynamicQr == null ? "Без лимита" : String(p.limits.maxDynamicQr))],
    ["Коды в архиве кабинета", ...plans.map(p => p.limits.maxQrCodes == null ? "Без лимита" : String(p.limits.maxQrCodes))],
    ["Статистика динамических QR", ...plans.map(p => p.limits.allowsAnalytics ? "Открытия, дни и устройства" : "Нет")],
    ["Форматы экспорта", ...plans.map(p => p.limits.exportFormats.join(", "))],
    ["Рамки с призывом", "Да", "Да", "Да"],
    ["CSV за один запрос", "Нет", `До ${COMMERCIAL.pro.csvRows} строк`, `До ${COMMERCIAL.business.csvRows} строк`],
    ["Команда", ...plans.map(p => p.limits.maxUsers === 1 ? "1 пользователь" : p.limits.maxUsers == null ? "Без лимита" : `До ${p.limits.maxUsers} участников`)],
    ["API", "Нет", "Нет", "Да"],
    ["Поддержка", "По электронной почте", "По электронной почте", "По электронной почте"],
  ];
  return <div className="qrs-public"><SiteHeader session={session} /><main className={`fk-container ${s.page}`}><PricingPageGoal /><PublicBreadcrumb current="Тарифы" />
    <PublicPageHeading title={`Тарифы QR-S: бесплатно, Про за ${rubles(pro.priceRub)} и Бизнес`}><p>Начните с бесплатных кодов. Про — {COMMERCIAL.trialDays} дней, без карты и автосписаний.</p></PublicPageHeading>
    <div className={s.plans}>{plans.map(plan => <section key={plan.id} className={`${s.plan} ${plan.id === "PRO" ? s.featured : ""}`}><div className={s.planHeading}><h2>{plan.name}</h2>{plan.id === "PRO" && <span>{COMMERCIAL.trialDays} дней без карты</span>}</div><p className={s.price}>{rubles(plan.priceRub)}<small> / месяц</small></p><p>{plan.description}</p><ul>{plan.limitLabels.map(label => <li key={label}><span aria-hidden="true">✓</span><span>{label}</span></li>)}</ul><Button href={session ? `/dashboard/billing?plan=${plan.id.toLowerCase()}` : `/register?plan=${plan.id.toLowerCase()}`} variant={plan.id === "PRO" ? "primary" : "secondary"}>{plan.id === "FREE" ? "Начать бесплатно" : plan.id === "PRO" ? `Попробовать Про ${COMMERCIAL.trialDays} дней` : "Выбрать Бизнес"}</Button></section>)}</div>
    <section className={s.comparison} aria-labelledby="comparison-title"><h2 id="comparison-title">Сравнение возможностей</h2><div className={s.tableWrap} role="region" aria-label="Сравнение тарифов — таблица с горизонтальной прокруткой" tabIndex={0}><table><thead><tr><th scope="col">Возможности</th>{plans.map(p => <th scope="col" key={p.id}>{p.name}</th>)}</tr></thead><tbody>{rows.map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table></div>
    <p className={s.note}>PDF и EPS содержат растровое изображение. SVG — векторный формат.</p></section>
    <section className={s.faq}><h2>Вопросы об оплате</h2><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
    <p className={s.legalLinks}><Link href="/terms-of-service#payment">Оплата и доступ</Link> · <Link href="/terms-of-service#refund">Возврат денег</Link> · <Link href="/terms-of-service">Публичная оферта</Link></p>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({"@context":"https://schema.org","@type":"FAQPage", mainEntity:faqs.map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))}).replace(/</g,"\\u003c")}} />
  </main><SiteFooter session={session} /></div>;
}
