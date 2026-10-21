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
const description = "Отсканируйте QR-код камерой телефона или ноутбука, загрузите фото или вставьте скриншот через Ctrl+V. Без регистрации, изображение не покидает браузер. Ссылки, Wi-Fi, контакты.";
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
    <PublicPageHeading title="Сканер QR-кода онлайн"><p>Наведите камеру, выберите фото или вставьте скриншот — узнайте, что внутри QR.</p></PublicPageHeading>
    <QrScanner/>
    <div className={s.reading}>
      <section><h2>Как отсканировать QR-код онлайн</h2><ol className={s.steps}><li><h3>Выберите источник</h3><p>Включите камеру, если код перед вами на бумаге или другом экране. Для сохранённой картинки откройте вкладку «Фото или скриншот»: выберите файл, перетащите его в область загрузки или вставьте из буфера обмена.</p></li><li><h3>Дождитесь распознавания</h3><p>Покажите код целиком, вместе с чистым полем вокруг. При съёмке держите телефон ровно и дождитесь фокусировки. Для файла обработка начнётся сразу после выбора. Если код не найден, попробуйте более чёткий снимок или обрежьте лишний фон.</p></li><li><h3>Проверьте результат</h3><p>Сканер покажет содержимое и определит ссылку, текст, Wi-Fi или vCard. Данные можно скопировать. Для ссылки отдельно показан домен: переход в новую вкладку произойдёт только после нажатия «Открыть».</p></li></ol></section>
      <section><h2>С телефона, компьютера или скриншота</h2><p>На телефоне удобнее начать с задней камеры. Доступ запрашивается после нажатия кнопки; включать микрофон не требуется. Если браузер не разрешает съёмку, сохраните фото или скриншот и выберите файл — этот способ работает без камеры.</p><p>На компьютере подойдёт веб-камера или изображение из файла. Для QR на экране того же устройства сделайте скриншот. Вставка через Ctrl+V или ⌘V работает, когда в буфере находится именно изображение, а не адрес файла или ссылка на него.</p><p>Поддерживаются PNG, JPEG, WebP, GIF и BMP. Для анимированного изображения используйте неподвижный кадр с QR. Фото HEIC сначала сохраните как JPEG. Сканер читает один код за раз: если на картинке их несколько, лучше обрезать нужный.</p></section>
      <section><h2>Что может быть внутри QR-кода</h2><p>Ссылка показана вместе с полным адресом и доменом. Сверьте написание, особенно в платёжных сообщениях и запросах авторизации. Похожие символы, IP-адрес и отсутствие HTTPS требуют дополнительного внимания. Даже обычная HTTPS-ссылка может вести на поддельный сайт: шифрование само по себе не подтверждает владельца.</p><p>Wi-Fi-код содержит имя сети, способ защиты и пароль. Вы можете скопировать пароль и подключиться через настройки устройства. Визитка vCard показывает имя, телефон и email; контакт не сохраняется автоматически. Остальные форматы, включая произвольный текст, отображаются как исходное содержимое.</p><p>QR-S не запрашивает короткую ссылку для её проверки и не раскрывает перенаправление. Поэтому распознавание динамического кода здесь само по себе не добавляет открытие в его статистику. Нажатие «Открыть» уже является обычным переходом, который сайт назначения может учитывать.</p></section>
      <section><h2>Почему QR-код не сканируется</h2><ul><li>Код размыт или камера ещё не сфокусировалась. Зафиксируйте телефон и добавьте света.</li><li>Блик закрывает часть рисунка. Измените угол съёмки без сильного наклона.</li><li>QR слишком мелкий. Приблизьте камеру или возьмите исходное изображение большего размера.</li><li>Обрезаны углы или белое поле. Покажите весь код и немного пространства вокруг.</li><li>Мало контраста или рисунок повреждён. Попробуйте другой экземпляр или исходник до печати.</li></ul><p>Если данных недостаточно, сканер покажет сообщение об ошибке и предложит другое изображение. <Link href="/blog/qr-kod-ne-skaniiruetsya-ispravit">Подробнее о причинах и исправлении →</Link></p></section>
      <section className={s.faq}><h2>Вопросы о сканировании QR</h2>{scannerFaq.map(([question,answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtmlScript(data)}}/>
  </main><SiteFooter session={session}/></div>;
}
