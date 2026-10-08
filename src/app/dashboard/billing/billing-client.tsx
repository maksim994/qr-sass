"use client";
import { TRIAL_DAYS } from "@/lib/trial-policy";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { getMetrikaAttribution } from "@/lib/metrika-client-id";
import { useProductPageGoal } from "@/hooks/use-product-page-goal";
import { YookassaWidget } from "@/components/yookassa-widget";
import { Alert, Button } from "@/components/ui";
import type { PlanInfo } from "@/lib/plans";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { QrLifetimeNote } from "@/components/qr/qr-lifetime-note";
import { MSG } from "@/lib/user-messages";
import { PaymentTermsLinks } from "@/components/legal/payment-terms-links";
import type { buildRobokassaPayment } from "@/lib/robokassa";
import styles from "./billing.module.css";

export type BillingPaymentRow = { id: string; amount: number; currency: string; planId: string | null; status: string; createdAt: string; description: string | null; isTest: boolean };
type Props = {
  currentPlan: PlanInfo; archivedOffer: PlanInfo | null; complimentary: boolean;
  workspaceId: string; currentPlanId: string; isTrial: boolean;
  status: "free" | "trial" | "active" | "expired" | "canceled";
  periodEnd: string | null; plans: PlanInfo[]; trialUsedAt: boolean;
  payments: BillingPaymentRow[]; supportEmail: string | null;
  canManageBilling: boolean; usage: { qrCount: number; memberCount: number };
  returnPayment: { status: string; isTest: boolean; fulfilled: boolean } | null;
};
const STATUS_LABEL: Record<string, string> = { PENDING: "Ожидает оплаты", SUCCEEDED: "Оплачен", CANCELED: "Отменён", REFUNDED: "Возврат" };
const money = (amount: number) => `${amount.toLocaleString("ru-RU")} ₽`;
const dateLabel = (date: string) => new Date(date).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric", timeZone:"Europe/Moscow" });

export function BillingClient({ currentPlan, archivedOffer, complimentary, workspaceId, currentPlanId, isTrial, status, periodEnd, plans, trialUsedAt, payments, supportEmail, canManageBilling, usage, returnPayment }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const busyRef = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const checkoutHeading = useRef<HTMLHeadingElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [robokassa, setRobokassa] = useState<ReturnType<typeof buildRobokassaPayment> | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const current = currentPlan;
  const paidUntil = periodEnd ? dateLabel(periodEnd).replace(/\.$/, "") : null;
  const hasPaidAccess = currentPlanId !== "FREE";
  const busy = pending !== null || paymentSuccess;
  useProductPageGoal(PRODUCT_GOALS.pricing_viewed, "billing");
  useEffect(() => { if (error || paymentSuccess) feedbackRef.current?.focus(); }, [error, paymentSuccess]);
  useEffect(() => { if (token || robokassa) checkoutHeading.current?.focus(); }, [token, robokassa]);
  useEffect(() => {
    if (returnPayment?.status !== "PENDING") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      router.refresh();
      if (++attempts >= 15) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [returnPayment?.status, router]);

  async function handleStartTrial() {
    if (!canManageBilling || busyRef.current || paymentSuccess) return;
    if (complimentary) return;
    if (archivedOffer && !window.confirm("Начать пробный период на текущих публичных условиях? Архивные условия будут заменены, старые QR продолжат работать.")) return;
    busyRef.current = true; setPending("trial"); setError(null);
    try {
      const response = await fetchApi("/api/billing/trial", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({workspaceId,useCurrentTerms:!!archivedOffer}) });
      const parsed = await parseApiResponse(response);
      if (!parsed.ok) throw new Error(parsed.error || MSG.BILLING_TRIAL_FAILED);
      trackGoal(PRODUCT_GOALS.trial_started, { planId: "PRO" });
      router.push("/dashboard"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : MSG.BILLING_TRIAL_FAILED); }
    finally { busyRef.current = false; setPending(null); }
  }
  async function handleCheckout(plan: PlanInfo) {
    if (!canManageBilling || complimentary || busyRef.current || paymentSuccess) return;
    const useCurrentTerms = !!archivedOffer && plan.accessMode !== "archive";
    if (useCurrentTerms && !window.confirm(`Перейти на тариф «${plan.name}» за ${money(plan.priceRub)} в месяц? После оплаты архивные условия будут заменены. Существующие QR продолжат работать.`)) return;
    busyRef.current = true; setPending(plan.id); setError(null); setSelectedPlan(plan);
    try {
      const metrika = await getMetrikaAttribution();
      const response = await fetchApi("/api/billing/checkout", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId,planId:plan.id,useCurrentTerms,...(metrika ? { metrika } : {})})});
      const parsed = await parseApiResponse<{token?:string; provider?:string; payment?:ReturnType<typeof buildRobokassaPayment>}>(response);
      if (!parsed.ok) throw new Error(parsed.error || MSG.BILLING_CHECKOUT_FAILED);
      if (parsed.data?.payment || parsed.data?.token) trackGoal(PRODUCT_GOALS.checkout_started, { planId: plan.id });
      if (parsed.data?.provider === "robokassa" && parsed.data.payment) setRobokassa(parsed.data.payment);
      else if (parsed.data?.token) setToken(parsed.data.token);
      else throw new Error(MSG.BILLING_CHECKOUT_FAILED);
    } catch (error) { setError(error instanceof Error ? error.message : MSG.BILLING_CHECKOUT_FAILED); }
    finally { busyRef.current = false; setPending(null); }
  }
  function renderPlanAction(plan: PlanInfo) {
    if (!canManageBilling || complimentary || plan.id === "FREE" || (plan.id === "PRO" && currentPlanId === "BUSINESS" && !isTrial)) return null;
    const canTrial = plan.accessMode !== "archive" && plan.id === "PRO" && !trialUsedAt && currentPlanId === "FREE";
    const label = archivedOffer && plan.accessMode !== "archive" ? `Перейти на ${plan.name}` : currentPlanId === plan.id && !isTrial ? `Продлить ${plan.name}` : isTrial && currentPlanId === plan.id ? `Оплатить ${plan.name}` : `Выбрать ${plan.name}`;
    return <div className={styles.planActions}>
      {canTrial && <><Button block disabled={busy} onClick={handleStartTrial}>{pending === "trial" ? "Включаем доступ…" : `Попробовать ${TRIAL_DAYS} дней`}</Button><p>Бесплатно, без автоматических списаний</p></>}
      {/* The ref is read only inside the click handler, never while rendering this button. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <Button id={`billing-plan-${plan.accessMode ?? "standard"}-${plan.id}`} variant={canTrial ? "secondary" : "primary"} block disabled={busy} onClick={() => handleCheckout(plan)}>{pending === plan.id ? "Готовим оплату…" : `${label} · ${money(plan.priceRub)}`}</Button>
    </div>;
  }

  return <div className={styles.billing}>
    <section className={styles.current} aria-labelledby="current-plan-heading">
      <div className={styles.currentMain}><div className={styles.currentTitle}><h2 id="current-plan-heading">Тариф «{current?.name ?? currentPlanId}»</h2><span className={styles.status}>{complimentary ? "Бесплатно · бессрочно" : isTrial ? "Пробный период" : hasPaidAccess ? "Действует" : "Бесплатный доступ"}</span></div>
        <p>{complimentary ? "Доступ без оплаты и без срока окончания." : isTrial ? `Пробный доступ${paidUntil ? ` до ${paidUntil}` : ""}.` : hasPaidAccess ? `Доступ${paidUntil ? ` до ${paidUntil}` : " активен"}.` : status === "expired" || status === "canceled" ? `Платный период завершён${paidUntil ? ` ${paidUntil}` : ""}. Сейчас действует бесплатный тариф.` : "Пользуйтесь базовыми возможностями без оплаты."}</p>
        <span className={styles.renewal}>{complimentary ? "Продление не требуется." : hasPaidAccess ? "Продление вручную. Автоматических списаний нет." : "Выберите платный тариф, когда понадобятся дополнительные возможности."}</span>
      </div>
      <div className={styles.usage}><div><span>QR-коды</span><strong>{usage.qrCount.toLocaleString("ru-RU")}<small>{current?.limits.maxQrCodes == null ? "без лимита" : `из ${current.limits.maxQrCodes}`}</small></strong></div><div><span>Участники</span><strong>{usage.memberCount.toLocaleString("ru-RU")}<small>{current?.limits.maxUsers == null ? "без лимита" : `из ${current.limits.maxUsers}`}</small></strong></div></div>
    </section>
    {archivedOffer && !complimentary && <section className={styles.current} aria-label="Архивные условия">
      <div><h2>{archivedOffer.name}</h2><p>Сохранённые условия: {money(archivedOffer.priceRub)}{archivedOffer.id === "FREE" ? ", без оплаты" : " за месяц"}. Изменения публичных тарифов на них не влияют.</p>
      {archivedOffer.id !== "FREE" && renderPlanAction(archivedOffer)}</div>
    </section>}
    {!canManageBilling && <p className={styles.roleNote}>Оплатить тариф или включить пробный доступ может владелец или администратор кабинета.</p>}
    {!complimentary && <div className={styles.purchaseTerms}><p>Оплачивая тариф, вы принимаете условия предоставления доступа и возврата денег. Документы откроются в новой вкладке.</p><PaymentTermsLinks newTab /></div>}
    {(error || paymentSuccess) && <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}>
    {error && <Alert variant="danger" title="Не удалось продолжить" onClose={() => setError(null)}>{error}</Alert>}
    {paymentSuccess && <Alert variant="success" title="Оплата завершена"><p>Тариф обновится после подтверждения платежа. Если изменения ещё не появились, проверьте статус чуть позже.</p><Button variant="secondary" size="sm" className="mt-3" onClick={() => window.location.reload()}>Обновить статус</Button></Alert>}
    </div>}
    {returnPayment && <div className={styles.feedback} role="status"><Alert variant={returnPayment.status === "SUCCEEDED" ? "success" : "info"} title={returnPayment.status === "SUCCEEDED" ? returnPayment.isTest ? "Тестовая оплата подтверждена" : "Оплата подтверждена" : "Статус платежа"}>
      <p>{returnPayment.status === "SUCCEEDED" ? returnPayment.isTest ? "Проверка завершена. Тестовая оплата не меняет тариф и срок доступа." : returnPayment.fulfilled ? "Тариф и срок доступа обновлены." : "Деньги получены. Обратитесь в поддержку для проверки доступа по этому платежу." : returnPayment.status === "CANCELED" ? "Платёж отменён." : returnPayment.status === "REFUNDED" ? "По этому платежу оформлен возврат." : "Ожидаем подтверждения оплаты. Статус обновляется автоматически в течение 30 секунд. Перед повторной оплатой проверьте историю платежей."}</p>
      {returnPayment.status === "PENDING" && <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.refresh()}>Обновить статус</Button>}
    </Alert></div>}
    {complimentary ? null : (token || robokassa) && selectedPlan ? <section className={styles.checkout} aria-labelledby="checkout-heading">
      <button className={styles.backLink} type="button" onClick={() => { setToken(null); setRobokassa(null); requestAnimationFrame(() => document.getElementById(`billing-plan-${selectedPlan.accessMode ?? "standard"}-${selectedPlan.id}`)?.focus()); }}>К выбору тарифа</button>
      <div className={styles.checkoutHead}><div><h2 id="checkout-heading" ref={checkoutHeading} tabIndex={-1}>Оплата тарифа «{selectedPlan.name}»</h2><p>Разовый платёж за месяц доступа</p></div><strong>{money(selectedPlan.priceRub)}</strong></div>
      <p className={styles.checkoutNote}>{hasPaidAccess && !isTrial && (status === "active" || status === "canceled") ? "Месяц добавится к оставшемуся оплаченному сроку." : "Месяц доступа начнётся после оплаты. Остаток пробного периода не прибавляется."} Автоматических списаний нет.</p>
      {robokassa ? <form action={robokassa.action} method="POST">
        {Object.entries(robokassa.fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        {robokassa.fields.IsTest === "1" && <p className={styles.checkoutNote}>Тестовая оплата: деньги не списываются, тариф и срок доступа не меняются.</p>}
        <Button type="submit">Перейти к оплате в Robokassa</Button>
      </form> : token && <YookassaWidget token={token} onSuccess={() => { setPaymentSuccess(true); setToken(null); router.refresh(); }} onError={() => { setError(MSG.BILLING_WIDGET_FAILED); setToken(null); }} />}
    </section> : <section id="plans" className={styles.plans} aria-labelledby="plans-heading">
      <div className={styles.sectionHead}><h2 id="plans-heading">Выберите возможности для ваших задач</h2><p>Платные тарифы оплачиваются на месяц. Продление — вручную.</p></div>
      <div className={styles.planGrid}>{plans.map(plan => {
        const isCurrent = !current.accessMode && currentPlanId === plan.id || current.accessMode === "standard" && currentPlanId === plan.id;
        return <section key={plan.id} className={`${styles.plan} ${isCurrent ? styles.planCurrent : ""}`} aria-labelledby={`plan-${plan.id}`}>
          <div className={styles.planHead}><h3 id={`plan-${plan.id}`}>{plan.name}</h3>{isCurrent && <span>{isTrial ? "Пробный" : "Ваш тариф"}</span>}</div>
          <p className={styles.price}>{money(plan.priceRub)}<span>{plan.id === "FREE" ? "без оплаты" : "за месяц"}</span></p>
          <ul className={styles.features}>{plan.limitLabels.map((label,index) => <li key={index}>{label.replaceAll("workspace", "кабинета").replace("Workspace API-ключи", "API-ключи кабинета")}</li>)}</ul>
          {renderPlanAction(plan)}
          {plan.id === "FREE" && <p className={styles.planFoot}>{isCurrent ? "Уже доступен в вашем кабинете" : "После окончания платного периода"}</p>}
        </section>;
      })}</div>
    </section>}
    <details className={styles.lifetime}><summary>Что будет с QR после окончания тарифа</summary><QrLifetimeNote variant="billing" /></details>
    <section className={styles.history} aria-labelledby="payment-history-heading"><div className={styles.sectionHead}><h2 id="payment-history-heading">История платежей</h2><p>{payments.length > 0 ? "Последние 30 платежей" : "Здесь появятся ваши оплаты и их статусы"}</p></div>
      {payments.length === 0 ? <div className={styles.historyEmpty}><p>Платежей пока нет</p><span>Пробный доступ не создаёт платёж.</span></div> : <table className={styles.table}><thead><tr><th scope="col">Дата · МСК</th><th scope="col">Тариф</th><th scope="col">Сумма</th><th scope="col">Статус</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td><time dateTime={payment.createdAt}>{dateLabel(payment.createdAt)}</time></td><td>{plans.find(plan => plan.id === payment.planId)?.name ?? payment.description ?? "—"}{payment.isTest && <small> · Тест</small>}</td><td className={styles.amount}>{payment.currency === "RUB" ? money(payment.amount) : `${payment.amount.toLocaleString("ru-RU")} ${payment.currency}`}</td><td><span className={styles.paymentStatus} data-status={payment.status}>{STATUS_LABEL[payment.status] ?? payment.status}</span></td></tr>)}</tbody></table>}
    </section>
    {supportEmail && <p className={styles.support}>Вопросы по оплате: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>}
  </div>;
}
