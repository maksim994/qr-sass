import { UtilityPage } from "@/components/utility/utility-page";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return <UtilityPage title="Страница не найдена" description="Возможно, адрес изменился или в ссылке есть опечатка. Вернитесь на главную, чтобы создать QR-код или найти нужный раздел.">
    <Button href="/">На главную</Button>
  </UtilityPage>;
}
