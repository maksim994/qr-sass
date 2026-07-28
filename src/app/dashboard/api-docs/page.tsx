import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ApiDocsClient } from "./api-docs-client";

export default function ApiDocsPage() {
  const baseUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
