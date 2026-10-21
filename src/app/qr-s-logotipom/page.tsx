import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDisabledQrTypes } from "@/lib/disabled-qr-types";
import { publicSiteUrl } from "@/lib/public-url";
import { jsonForHtmlScript } from "@/lib/html-script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumb, PublicPageHeading } from "@/components/public/page-heading";
import { LogoQrGenerator } from "@/components/landing/logo-qr-generator";
import s from "./logo-page.module.css";

export const dynamic = "force-dynamic";
const title = "QR-код с логотипом онлайн: PNG и SVG без регистрации";
const description = "Сделай QR-код с логотипом онлайн: загрузи PNG, JPEG или WebP, скачай PNG или SVG 1200×1200 без регистрации. Логотип обрабатывается в браузере, на сервер не уходит.";
export const metadata: Metadata = { title, description, alternates:{canonical:publicSiteUrl("/qr-s-logotipom")}, openGraph:{title,description,type:"website",url:publicSiteUrl("/qr-s-logotipom")} };
const faqs = [
  ["Нужна ли регистрация, чтобы сделать QR-код с логотипом?", "Нет. Загрузи логотип и скачай код в PNG или SVG без входа в аккаунт."],
  ["Какие форматы логотипа подходят?", "PNG, JPEG и WebP до 5 МБ. Удобнее всего PNG с прозрачным фоном."],
  ["Не перестанет ли код сканироваться из-за логотипа?", "Генератор сам включает уровень коррекции ошибок H, ограничивает размер логотипа и кладёт под него светлую подложку. При слабом контрасте скачивание заблокировано. Всё равно проверь готовый код телефоном перед печатью."],
  ["Можно ли потом поменять ссылку в коде?", "В коде с этой страницы нельзя: он статический. Если ссылка может измениться, создай динамический код в личном кабинете. Два таких кода бесплатно, дальше тариф Про за 299 ₽ в месяц."],
  ["Куда уходит мой логотип?", "Никуда. Файл обрабатывается в твоём браузере и на сервер не отправляется."],
] as const;

export default async function LogoQrPage() {
  const [session,disabled] = await Promise.all([getSession(),getDisabledQrTypes()]);
  const schema = {"@context":"https://schema.org","@graph":[
    {"@type":"SoftwareApplication",name:"Генератор QR-кода с логотипом QR-S",url:publicSiteUrl("/qr-s-logotipom"),applicationCategory:"UtilitiesApplication",operatingSystem:"Web",offers:{"@type":"Offer",price:"0",priceCurrency:"RUB"}},
    {"@type":"FAQPage",mainEntity:faqs.map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))},
  ]};
  return <div className="qrs-public"><SiteHeader session={session} createHref="#create-qr"/><main className={`fk-container ${s.page}`}>
    <PublicBreadcrumb current="QR с логотипом"/><PublicPageHeading title="QR-код с логотипом"><p>Вставь ссылку, добавь свой логотип и скачай код в PNG или SVG без регистрации.</p></PublicPageHeading>
    <LogoQrGenerator enabled={!disabled.includes("URL")}/>
    <div className={s.reading}>
      <section><h2>Как сделать QR-код с логотипом</h2><ol><li>Вставь ссылку, которая должна открываться по коду.</li><li>Загрузи логотип в PNG, JPEG или WebP, файл до 5 МБ. Он обрабатывается прямо в браузере и на сервер не отправляется.</li><li>Проверь превью и скачай код в PNG или SVG размером 1200×1200. Регистрация не нужна.</li></ol><p>Код на этой странице статический: ссылка зашита в сам рисунок, и поменять её после печати не получится. Если адрес может измениться, используй <Link href="/dynamic-qr">динамический код</Link> в личном кабинете. Там ссылку можно править в любой момент. Два динамических кода доступны бесплатно, дальше тариф Про за 299 ₽ в месяц.</p></section>
      <section><h2>Какой логотип подойдёт и что помогает коду оставаться читаемым</h2><p>Логотип закрывает часть узора в центре. Чтобы помочь сканеру прочитать код, генератор сам включает максимальный уровень коррекции ошибок, H. Он позволяет восстановить данные, даже если часть модулей скрыта, но не гарантирует чтение любого макета.</p><p>Чтобы запас прочности не закончился, размер логотипа ограничен: слишком крупным его сделать не выйдет. Под логотип генератор кладёт светлую подложку, так он не сливается с точками кода.</p><p>Что учесть при выборе файла:</p><ul><li>простой знак или монограмма читаются лучше длинной надписи;</li><li>квадратный или круглый логотип ложится в центр аккуратнее вытянутого;</li><li>PNG с прозрачным фоном смотрится чище, чем картинка с белым прямоугольником.</li></ul><p>Если цвета кода и фона слишком близки, скачать код не получится: генератор заблокирует кнопку, пока ты не усилишь контраст. Тёмный код на светлом фоне читается надёжнее всего.</p><p>Подробнее о размещении знака бренда и проверке результата — в статье <Link href="/blog/qr-kod-s-logotipom-brenda">«QR-код с логотипом»</Link>.</p></section>
      <section><h2>Печать и проверка</h2><p>PNG подойдёт для сайта, соцсетей и документов. Для типографии бери SVG: его можно увеличить до любого размера без потери чёткости. Учти, что логотип внутри SVG встроен как картинка, поэтому при сильном увеличении его качество зависит от исходного файла. Загружай логотип в хорошем разрешении.</p><p>Какой размер выбрать для визитки, листовки или баннера, разобрали в статье <Link href="/blog/razmer-qr-koda-dlya-pechati">«Размер QR-кода для печати»</Link>.</p><p>Перед тем как отправить макет в печать, проверь код с нескольких телефонов. Если под рукой только компьютер, загрузи файл в наш <Link href="/skaner-qr-koda">сканер QR-кода</Link>: он покажет, что внутри.</p></section>
      <section><h2>Вопросы и ответы</h2>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <nav aria-label="Другие способы создать QR"><Link href="/qr-po-ssylke">QR по ссылке</Link><Link href="/qr-wifi">QR для Wi-Fi</Link><Link href="/dynamic-qr">Менять ссылку после печати</Link></nav>
    </div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtmlScript(schema)}}/>
  </main><SiteFooter session={session}/></div>;
}
