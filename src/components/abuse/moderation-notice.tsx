import Link from 'next/link';
import { UtilityPage } from '@/components/utility/utility-page';
export function ModerationNotice({ status, code }: { status: string; code: string }) {
  return <UtilityPage variant="warning" title={status === 'BLOCKED' ? 'Ссылка заблокирована за нарушение правил сервиса' : 'Ссылка временно на проверке. Попробуйте открыть позже'}>
    <Link href={`/report/${encodeURIComponent(code)}`}>Пожаловаться</Link><a href="mailto:abuse@qr-s.ru">abuse@qr-s.ru</a>
  </UtilityPage>;
}
