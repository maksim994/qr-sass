import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";
import { publicSiteUrl } from "@/lib/public-url";

export const metadata: Metadata = {
  title: `${QR_LIFETIME.title} — qr-s.ru`,
  description: "Напечатанные QR продолжают открываться после окончания тарифа. Два динамических кода бесплатно: меняйте ссылку в кабинете без перепечатки.",
  alternates: { canonical: publicSiteUrl(QR_LIFETIME_PATH) },
};

export default async function QrLifetimePage() {
  const session = await getSession();

  return (
    <LegalArticleLayout
      contents={[{ id: "printed", title: "Что происходит после печати" }, { id: "dynamic", title: "Динамический QR" }, { id: "static", title: "Статический QR" }, { id: "billing", title: "Тариф и пробный период" }, { id: "account", title: "Удаление аккаунта" }]}
      session={session}
      eyebrow="Правила сервиса"
      title={QR_LIFETIME.title}
      updatedLabel={`Последнее обновление: ${new Date(QR_LIFETIME.updated).toLocaleDateString("ru-RU")}`}
    >
      <h2 id="printed">Что происходит после печати</h2>
      <p>
        Основная ценность динамического QR — сохранить тот же напечатанный код, когда нужно сменить адрес сайта. Ниже
        зафиксировано, что делает сервис, а что нет.
      </p>

      <h2 id="dynamic">Динамический QR</h2>
      <p>{QR_LIFETIME.downloadDynamic}</p>
      <ul>
        <li>Сканирование идёт через короткую ссылку qr-s.ru и не зависит от текущего тарифа.</li>
        <li>Без оплаты у вас 2 динамических кода, и у них можно менять ссылку. Новые динамические коды сверх двух и расширенные лимиты — на Про или Бизнесе.</li>
        <li>Удаление из библиотеки отключает короткую ссылку: напечатанный код откроет сообщение, что QR недоступен.</li>
        <li>Если у кода задан свой срок или лимит сканирований, после них открывается страница истечения, даже при оплаченном тарифе.</li>
      </ul>

      <h2 id="static">Статический QR</h2>
      <p>{QR_LIFETIME.downloadStatic}</p>

      <h2 id="billing">Тариф и пробный период</h2>
      <p>{QR_LIFETIME.billing}</p>

      <h2 id="account">Удаление аккаунта</h2>
      <p>
        Если рабочее пространство или коды архивируются при удалении аккаунта, динамические короткие ссылки перестают
        открываться так же, как после удаления из библиотеки.
      </p>

      <p>
        Вопросы по уже напечатанным тиражам:{" "}
        <Link href="/pricing">раздел оплаты</Link> или контакты на сайте.
      </p>
    </LegalArticleLayout>
  );
}
