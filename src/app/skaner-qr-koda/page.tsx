import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { publicSiteUrl } from "@/lib/public-url";
import { jsonForHtmlScript } from "@/lib/html-script";
import { scannerFaq } from "@/lib/qr-scanner-content";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumb, PublicPageHeading } from "@/components/public/page-heading";
import { QrScanner } from "@/components/qr-scanner/qr-scanner";
import s from "./scanner-page.module.css";

export const dynamic = "force-dynamic";
const title = "Сканер QR-кода онлайн: с камеры, по фото и скриншоту";
const description = "Отсканируй QR-код камерой телефона или ноутбука, загрузи фото или вставь скриншот через Ctrl+V. Без регистрации, изображение не покидает браузер. Ссылки, Wi-Fi, контакты.";
function faqAnswer(answer: string) {
  const label = "«QR-код не сканируется: как исправить»";
  const index = answer.indexOf(label);
  return index < 0 ? answer : <>{answer.slice(0,index)}<Link href="/blog/qr-kod-ne-skaniiruetsya-ispravit">{label}</Link>{answer.slice(index+label.length)}</>;
}
export const metadata: Metadata = {
  title, description, alternates: { canonical: publicSiteUrl("/skaner-qr-koda") },
  openGraph: { title, description, type: "website", url: publicSiteUrl("/skaner-qr-koda") },
};

export default async function QrScannerPage() {
  const session = await getSession();
  const data = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebApplication", name: "Сканер QR-кода QR-S", url: publicSiteUrl("/skaner-qr-koda"), applicationCategory: "UtilitiesApplication", operatingSystem: "Web", browserRequirements: "JavaScript; HTTPS and camera permission for live scanning", offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" } },
    { "@type": "FAQPage", mainEntity: scannerFaq.map(([name,text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) },
  ] };
  return <div className="qrs-public"><SiteHeader session={session}/><main className={`fk-container ${s.page}`}>
    <PublicBreadcrumb current="Сканер QR-кода"/>
    <PublicPageHeading title="Сканер QR-кода онлайн"><p>Наведи камеру, загрузи фото или вставь скриншот: код распознается прямо в браузере.</p></PublicPageHeading>
    <QrScanner/>
    <div className={s.reading}>
      <section><h2>Как отсканировать QR-код онлайн</h2><ol className={s.steps}><li><h3>Выбери способ.</h3><p>Во вкладке «Камера» нажми кнопку запуска и выбери камеру, если их несколько. Во вкладке «Фото или скриншот» загрузи файл, перетащи его в рамку или вставь из буфера через Ctrl+V (на Mac ⌘V).</p></li><li><h3>Дождись результата.</h3><p>Сканер покажет, что внутри: ссылку, текст, данные Wi-Fi или контакт.</p></li><li><h3>Реши, что делать дальше.</h3><p>Содержимое можно скопировать. Ссылка откроется только после того, как ты нажмёшь «Открыть».</p></li></ol></section>
      <section><h2>С телефона, с компьютера, со скриншота</h2><p><strong>С телефона.</strong> Открой страницу в браузере, нажми кнопку камеры и разреши доступ. Если камер две, выбери основную: она лучше фокусируется на мелких кодах.</p><p><strong>С компьютера.</strong> Подойдёт веб-камера ноутбука. Если камеры нет, сохрани картинку с кодом и загрузи её файлом или просто перетащи в рамку.</p><p><strong>Со скриншота.</strong> Код на экране того же устройства камерой не поймать. Сделай скриншот и вставь его через Ctrl+V или ⌘V, либо загрузи как файл. Подходят PNG, JPEG, WebP, GIF и BMP до 20 МБ. Формат HEIC сканер не читает: сохрани фото как JPEG или сделай скриншот.</p></section>
      <section><h2>Что может быть в QR-коде и как проверить ссылку</h2><p>Сканер различает четыре вида содержимого:</p><ul><li><strong>Ссылка.</strong> Адрес сайта, домен показан крупно.</li><li><strong>Текст.</strong> Любая строка, её можно скопировать.</li><li><strong>Wi-Fi.</strong> Имя сети, тип шифрования и пароль.</li><li><strong>Контакт (vCard).</strong> Имя, телефоны и email.</li></ul><p>Перед переходом посмотри на домен. Он должен совпадать с тем, что ты ожидаешь: адрес магазина, кафе или сервиса, а не похожий набор букв. Сам переход только по кнопке «Открыть», поэтому у тебя всегда есть время подумать.</p><p>Ссылки, в которых зашиты логин и пароль, и адреса с необычными схемами сканер не открывает вовсе. При этом проверять сайт на безопасность он не умеет: решение о переходе остаётся за тобой. Если сомневаешься, не открывай ссылку и найди сайт через поиск.</p></section>
      <section><h2>Почему QR-код не сканируется</h2><ul><li>Код слишком мелкий или снят издалека. Поднеси камеру ближе или обрежь картинку вокруг кода.</li><li>Фото размытое или с бликом. Сними ещё раз при ровном свете.</li><li>Не хватает контраста: светлый код на светлом фоне, цветной код на цветном фоне.</li><li>У кода обрезаны края или нет пустой рамки вокруг.</li><li>Файл в формате HEIC. Сохрани его как JPEG или сделай скриншот.</li></ul><p>Если ты сам сделал код и он не читается, разбор причин и способы исправить есть в статье <Link href="/blog/qr-kod-ne-skaniiruetsya-ispravit">«QR-код не сканируется: как исправить»</Link>.</p></section>
      <section className={s.faq}><h2>Вопросы и ответы</h2>{scannerFaq.map(([question,answer]) => <details key={question}><summary>{question}</summary><p>{faqAnswer(answer)}</p></details>)}</section>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtmlScript(data)}}/>
  </main><SiteFooter session={session}/></div>;
}
