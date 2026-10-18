import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ApiDocsClient } from "./api-docs-client";
import { publicOrigin } from "@/lib/public-url";

export default function ApiDocsPage() {
  const baseUrl = publicOrigin();

  return (
    <div className="qrs-api-docs-page">
      <DashboardPageHeader
        title="Документация API"
        description="REST API для управления QR-кодами. Доступно на тарифе Бизнес."
      />
      <ApiDocsClient baseUrl={baseUrl} />
    </div>
  );
}
