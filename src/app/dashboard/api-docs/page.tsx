import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { QrApiDocs } from "./qr-api-docs";
import { ApiDocsClient } from "./api-docs-client";
import { publicOrigin } from "@/lib/public-url";

export default function ApiDocsPage() {
  const baseUrl = publicOrigin();

  return (
    <div className="qrs-api-docs-page">
      <DashboardPageHeader
        title="Документация API"
        description="QR API v1: ключи, динамические ссылки, изображения и статистика на всех тарифах."
      />
      <QrApiDocs />
      <details><summary>Прежний API кабинета с ключами qre_ · Бизнес</summary><ApiDocsClient baseUrl={baseUrl} /></details>
    </div>
  );
}
