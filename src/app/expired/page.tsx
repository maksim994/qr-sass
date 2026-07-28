import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { UtilityPage } from "@/components/utility/utility-page";

export const metadata: Metadata = {
  title: "Срок действия истёк — qr-s.ru",
  description: "QR-код больше не действителен",
};

export default function ExpiredPage() {
  return (
    <UtilityPage
      variant="warning"
      title="Срок действия истёк"
      description="Этот QR-код больше не действителен. Возможно, истёк указанный срок или достигнут лимит сканирований."
    >
      <Button href="/" variant="primary">
        На главную
      </Button>
    </UtilityPage>
  );
}
