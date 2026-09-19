import { MSG } from "@/lib/user-messages";
type Result = { ok: boolean; reason: string; applied?: boolean };
export function describeReconciliation(result: Result | undefined): { error?: string; notice?: string } {
  if (!result?.ok) return { error: MSG.ADMIN_RECONCILE_UNAVAILABLE };
  if (result.applied) return { notice: "Оплата подтверждена, доступ кабинета обновлён." };
  const notices: Record<string, string> = {
    access_preserved: "Оплата получена, специальные условия сохранены. Проверьте платёж вручную: доступ по нему не изменялся.",
    canceled: "ЮKassa сообщает об отмене платежа. Проверьте актуальный статус в карточке.",
    pending: "Платёж всё ещё ожидает оплаты в ЮKassa.",
    waiting_for_capture: "Платёж ожидает подтверждения списания в ЮKassa.",
    already_applied: "Этот платёж уже был применён. Повторное начисление не выполнялось.",
    lost_claim: "Платёж обработан параллельным запросом. Проверьте актуальный статус в карточке.",
  };
  return notices[result.reason] ? { notice: notices[result.reason] } : { error: MSG.ADMIN_RECONCILE_NOT_APPLIED };
}
