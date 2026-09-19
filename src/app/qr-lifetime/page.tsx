import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LegalArticleLayout } from "@/components/legal/legal-article-layout";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";
import { publicSiteUrl } from "@/lib/public-url";

export const metadata: Metadata = {
  title: `${QR_LIFETIME.title} — qr-s.ru`,
  description: QR_LIFETIME.billing,
  alternates: { canonical: publicSiteUrl(QR_LIFETIME_PATH) },
};

export default async function QrLifetimePage() {
  const session = await getSession();

  return (
    <LegalArticleLayout
      session={session}
      eyebrow="Правила сервиса"
      title={QR_LIFETIME.title}
      updatedLabel={`Последнее обновление: ${new Date(QR_LIFETIME.updated).toLocaleDateString("ru-RU")}`}
    >
      <h2>Что происходит после печати</h2>
      <p>
        Основная ценность динамического QR — сохранить тот же напечатанный код, когда нужно сменить адрес сайта. Ниже
        зафиксировано, что делает сервис, а что нет.
      </p>

      <h2>Динамический QR</h2>
      <p>{QR_LIFETIME.downloadDynamic}</p>
      <ul>
        <li>Сканирование идёт через короткую ссылку qr-s.ru и не зависит от текущего тарифа.</li>
        <li>Сменить назначение, создать новый динамический код или расширить лимиты можно только при действующем Про или Бизнес.</li>
        <li>Удаление из библиотеки отключает короткую ссылку: напечатанный код откроет сообщение, что QR недоступен.</li>
        <li>Если у кода задан свой срок или лимит сканирований, после них открывается страница истечения, даже при оплаченном тарифе.</li>
      </ul>

      <h2>Статический QR</h2>
      <p>{QR_LIFETIME.downloadStatic}</p>

      <h2>Тариф и пробный период</h2>
      <p>{QR_LIFETIME.billing}</p>

      <h2>Удаление аккаунта</h2>
      <p>
        Если рабочее пространство или коды архивируются при удалении аккаунта, динамические короткие ссылки перестают
        открываться так же, как после удаления из библиотеки.
      </p>

      <p>
        Вопросы по уже напечатанным тиражам:{" "}
        <Link href="/dashboard/billing">раздел оплаты</Link> или контакты на сайте.
      </p>
    </LegalArticleLayout>
  );
}
