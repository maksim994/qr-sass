"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { YookassaWidget } from "@/components/yookassa-widget";
import { Alert } from "@/components/ui";
import type { PlanInfo } from "@/lib/plans";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

type Props = {
  workspaceId: string;
  currentPlanId: string;
  plans: PlanInfo[];
  trialUsedAt: boolean;
};

export function BillingClient({ workspaceId, currentPlanId, plans, trialUsedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    trackGoal(PRODUCT_GOALS.pricing_viewed);
  }, []);

  const planFree = plans.find((p) => p.id === "FREE");
  const planPro = plans.find((p) => p.id === "PRO");
  const planBusiness = plans.find((p) => p.id === "BUSINESS");

  async function handleStartTrial() {
    setTrialLoading(true);
    setError(null);
    try {
      const res = await fetchApi("/api/billing/trial", { method: "POST", body: JSON.stringify({ workspaceId }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка при запуске пробного периода");
      }
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setTrialLoading(false);
    }
  }

  async function handleCheckout(planId: string) {
    setLoading(true);
    setError(null);
    trackGoal(PRODUCT_GOALS.checkout_started, { planId });
    try {
      const res = await fetchApi("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ workspaceId, planId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка при создании платежа");
      }
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        throw new Error("Не удалось получить токен для оплаты");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <div id="plans" className="qrs-billing-checkout">
        <div className="qrs-plan-card">
          <h3 className="qrs-plan-card-name">Оплата</h3>
          <YookassaWidget
            token={token}
            onSuccess={() => {
              trackGoal(PRODUCT_GOALS.subscription_paid);
              setPaymentSuccess(true);
              setToken(null);
              window.setTimeout(() => window.location.reload(), 1200);
            }}
            onError={() => {
              setError("Произошла ошибка при оплате.");
              setToken(null);
            }}
          />
          <button type="button" onClick={() => setToken(null)} className="mt-4 qrs-navlink">
            Отменить
          </button>
        </div>
      </div>
    );
  }

  function renderPlanAction(planId: string) {
    const isCurrent = currentPlanId === planId;

    if (isCurrent) {
      return (
        <button type="button" disabled className="fk-button fk-button--secondary fk-button--block">
          Текущий тариф
        </button>
      );
    }

    if (planId === "FREE") {
      return null;
    }

    if (planId === "PRO") {
      if (currentPlanId === "BUSINESS") {
        return null;
      }

      if (!trialUsedAt && currentPlanId === "FREE") {
        return (
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={trialLoading}
            className="fk-button fk-button--primary fk-button--block"
          >
            {trialLoading ? "Запуск…" : "Начать пробный период"}
          </button>
        );
      }

      return (
        <button
          type="button"
          onClick={() => handleCheckout("PRO")}
          disabled={loading}
          className="fk-button fk-button--primary fk-button--block"
        >
          {loading ? "…" : `Выбрать Про — ${planPro?.priceRub?.toLocaleString("ru-RU") ?? "—"} ₽`}
        </button>
      );
    }

    if (planId === "BUSINESS") {
      return (
        <button
          type="button"
          onClick={() => handleCheckout("BUSINESS")}
          disabled={loading}
          className="fk-button fk-button--primary fk-button--block"
        >
          {loading ? "…" : `Выбрать Бизнес — ${planBusiness?.priceRub?.toLocaleString("ru-RU") ?? "—"} ₽`}
        </button>
      );
    }

    return null;
  }

  const planCards = [
    { plan: planFree, description: "До 10 статических QR, экспорт PNG и SVG." },
    { plan: planPro, description: "Динамические QR, аналитика, полная кастомизация." },
    { plan: planBusiness, description: "API, белая метка, SLA и персональный менеджер." },
  ].filter((item): item is { plan: PlanInfo; description: string } => !!item.plan);

  return (
    <div id="plans" className="qrs-billing-plans">
      {paymentSuccess && (
        <Alert variant="success" title="Оплата завершена" className="mb-5">
          Подписка обновлена. Страница перезагрузится через секунду.
        </Alert>
      )}
      {error && (
        <Alert variant="danger" title="Ошибка" onClose={() => setError(null)} className="mb-5">
          {error}
        </Alert>
      )}

      <div className="qrs-plan-grid">
        {planCards.map(({ plan, description }) => {
          const isCurrent = currentPlanId === plan.id;
          const action = renderPlanAction(plan.id);

          return (
            <div key={plan.id} className={`qrs-plan-card${isCurrent ? " qrs-plan-card--current" : ""}`}>
              {isCurrent && <span className="qrs-plan-card-badge">текущий</span>}
              <div className="qrs-plan-card-name">{plan.name}</div>
              <div className="qrs-plan-card-price tnum">
                {plan.priceRub.toLocaleString("ru-RU")} <span className="qrs-plan-card-price-suffix">₽</span>
              </div>
              <p className="qrs-plan-card-desc">{description}</p>
              {action ? <div className="qrs-plan-card-actions">{action}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
