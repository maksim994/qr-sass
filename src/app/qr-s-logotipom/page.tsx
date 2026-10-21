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
const title = "QR-код с логотипом — создать онлайн бесплатно";
const description = "Добавьте свой логотип в центр QR-кода. Вставьте ссылку, загрузите PNG, JPEG или WebP и скачайте PNG или SVG без регистрации. Коррекция H включается автоматически.";
export const metadata: Metadata = { title, description, alternates:{canonical:publicSiteUrl("/qr-s-logotipom")}, openGraph:{title,description,type:"website",url:publicSiteUrl("/qr-s-logotipom")} };
const faqs = [
  ["Можно ли создать QR с логотипом без регистрации?", "Да. Вставьте ссылку, загрузите логотип и скачайте статический QR в PNG или SVG. На этой странице аккаунт не нужен, файл обрабатывается в браузере."],
  ["Какие файлы логотипа подходят?", "PNG, JPEG и WebP до 5 МБ и 20 миллионов пикселей. Для SVG сначала сохраните копию в PNG. Логотип сохраняет пропорции и размещается на небольшой белой подложке в центре."],
  ["Зачем нужна коррекция H?", "Логотип закрывает часть модулей QR. Здесь автоматически используется уровень H, но это не гарантия чтения любого макета: важны размер, контраст, длина ссылки и качество печати."],
  ["Можно ли изменить ссылку после печати?", "У созданного здесь статического QR адрес зашит в код. Если ссылка изменится, понадобится новый QR. Для смены назначения после печати используйте динамический код в кабинете."],
  ["Как проверить QR с логотипом?", "Скачайте файл и распознайте его сканером. Перед тиражом сделайте пробную печать в конечном размере и проверьте её несколькими телефонами, при обычном освещении и с нужного расстояния."],
] as const;

export default async function LogoQrPage() {
  const [session,disabled] = await Promise.all([getSession(),getDisabledQrTypes()]);
  const schema = {"@context":"https://schema.org","@graph":[
    {"@type":"SoftwareApplication",name:"Генератор QR-кода с логотипом QR-S",url:publicSiteUrl("/qr-s-logotipom"),applicationCategory:"UtilitiesApplication",operatingSystem:"Web",offers:{"@type":"Offer",price:"0",priceCurrency:"RUB"}},
    {"@type":"FAQPage",mainEntity:faqs.map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}}))},
  ]};
  return <div className="qrs-public"><SiteHeader session={session} createHref="#create-qr"/><main className={`fk-container ${s.page}`}>
    <PublicBreadcrumb current="QR с логотипом"/><PublicPageHeading title="QR-код с вашим логотипом"><p>Вставьте ссылку, добавьте знак бренда и скачайте готовый QR — бесплатно, без регистрации.</p></PublicPageHeading>
    <LogoQrGenerator enabled={!disabled.includes("URL")}/>
    <div className={s.reading}>
      <section><h2>Как создать QR-код с логотипом</h2><ol><li><strong>Вставьте ссылку.</strong> Укажите открытый адрес сайта, меню или каталога и проверьте его без QR.</li><li><strong>Добавьте логотип.</strong> Выберите простое изображение с хорошо различимыми деталями. Генератор сохранит пропорции, оставит светлую подложку и включит коррекцию H.</li><li><strong>Скачайте и проверьте.</strong> PNG — для готового макета, SVG — для масштабирования. В SVG логотип остаётся встроенным растровым изображением.</li></ol></section>
      <section><h2>Логотип не должен мешать сканированию</h2><p>Не закрывайте угловые маркеры и пустое поле вокруг QR. Здесь логотип размещается только в центре, а его размер ограничен. Используйте тёмный узор на светлом фоне; при недостаточном контрасте скачивание блокируется.</p><p>Высокая коррекция помогает восстановлению данных, но не отменяет проверку готового файла и печати. <a href="https://www.qrcode.com/en/about/error_correction.html" target="_blank" rel="noopener noreferrer">Об уровнях коррекции — DENSO WAVE</a>.</p></section>
      <section><h2>Он пойдёт в печать?</h2><p>Проверьте QR в конечном размере на материале тиража. Не обрезайте чистое поле вокруг кода и не растягивайте картинку непропорционально. Для длинной ссылки узор становится плотнее — при необходимости увеличьте размер макета.</p><p><Link href="/skaner-qr-koda">Проверить скачанный файл сканером</Link> · <Link href="/blog/qr-kod-ne-skaniiruetsya-ispravit">Что делать, если QR не читается</Link></p></section>
      <section><h2>Частые вопросы</h2>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <nav aria-label="Другие способы создать QR"><Link href="/qr-po-ssylke">QR по ссылке</Link><Link href="/qr-wifi">QR для Wi-Fi</Link><Link href="/dynamic-qr">Менять ссылку после печати</Link></nav>
    </div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtmlScript(schema)}}/>
  </main><SiteFooter session={session}/></div>;
}
