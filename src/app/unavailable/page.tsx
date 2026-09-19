import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { UtilityPage } from "@/components/utility/utility-page";
import { QR_LIFETIME } from "@/lib/qr-lifetime-policy";

export const metadata: Metadata = {
  title: "QR-код недоступен — qr-s.ru",
  description: "Эта короткая ссылка больше не открывается",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function UnavailablePage({ searchParams }: Props) {
  const params = await searchParams;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const archived = reason === "archived";

  return (
    <UtilityPage
      variant="warning"
      title={archived ? QR_LIFETIME.archivedTitle : QR_LIFETIME.missingTitle}
      description={archived ? QR_LIFETIME.archivedDescription : QR_LIFETIME.missingDescription}
    >
      <Button href="/" variant="primary">
        На главную
      </Button>
    </UtilityPage>
  );
}
