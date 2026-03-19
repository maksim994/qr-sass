"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { YookassaWidget } from "@/components/yookassa-widget";
import type { PlanInfo } from "@/lib/plans";

type Props = {
  workspaceId: string;
  currentPlanId: string;
  plans: PlanInfo[]; // [PRO, BUSINESS]
  trialUsedAt: boolean;
};

export function BillingClient({ workspaceId, currentPlanId, plans, trialUsedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const planPro = plans.find((p) => p.id === "PRO");
  const planBusiness = plans.find((p) => p.id === "BUSINESS");

  async function handleStartTrial() {
    setTrialLoading(true);
    try {
      const res = await fetchApi("/api/billing/trial", { method: "POST", body: JSON.stringify({ workspaceId }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка при запуске пробного периода");
      }
      window.location.href = "/dashboard";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setTrialLoading(false);
    }
  }

  async function handleCheckout(planId: string) {
    setLoading(true);
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
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Оплата</h3>
        <YookassaWidget 
          token={token} 
          onSuccess={() => {
            alert("Оплата успешно завершена!");
            window.location.reload();
          }}
          onError={() => {
            alert("Произошла ошибка при оплате.");
            setToken(null);
          }}
        />
        <button 
          onClick={() => setToken(null)}
          className="mt-4 text-sm text-slate-500 hover:text-slate-900"
        >
          Отменить
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className={`card p-6 flex flex-col ${currentPlanId === "PRO" ? "ring-2 ring-blue-600" : ""}`}>
        <h3 className="text-xl font-bold text-slate-900">PRO</h3>
        <p className="mt-2 text-sm text-slate-500 flex-1">
          Для бизнеса и маркетинговых команд. Неограниченные QR-коды и аналитика.
        </p>
        <p className="mt-4 text-2xl font-bold text-slate-900 mb-6">
          {planPro ? `${planPro.priceRub.toLocaleString("ru-RU")} ₽` : "—"} <span className="text-sm font-normal text-slate-500">/ мес</span>
        </p>
        {currentPlanId === "PRO" ? (
          <button disabled className="btn btn-primary w-full">Текущий тариф</button>
        ) : !trialUsedAt ? (
          <div className="space-y-3">
            <button
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="btn btn-primary w-full"
            >
              {trialLoading ? "Запуск…" : "Начать пробный период"}
            </button>
            <button
              onClick={() => handleCheckout("PRO")}
              disabled={loading}
              className="btn btn-secondary w-full"
            >
              {loading ? "…" : `Оплатить ${planPro?.priceRub?.toLocaleString("ru-RU") ?? "—"} ₽`}
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleCheckout("PRO")}
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? "…" : `Выбрать PRO — ${planPro?.priceRub?.toLocaleString("ru-RU") ?? "—"} ₽`}
          </button>
        )}
      </div>

      <div className={`card p-6 flex flex-col ${currentPlanId === "BUSINESS" ? "ring-2 ring-blue-600" : ""}`}>
        <h3 className="text-xl font-bold text-slate-900">BUSINESS</h3>
        <p className="mt-2 text-sm text-slate-500 flex-1">
          Для крупных проектов. Командная работа, API, кастомные домены.
        </p>
        <p className="mt-4 text-2xl font-bold text-slate-900 mb-6">
          {planBusiness ? `${planBusiness.priceRub.toLocaleString("ru-RU")} ₽` : "—"} <span className="text-sm font-normal text-slate-500">/ мес</span>
        </p>
        <button 
          onClick={() => handleCheckout("BUSINESS")}
          disabled={loading || currentPlanId === "BUSINESS"}
          className="btn btn-primary w-full"
        >
          {currentPlanId === "BUSINESS" ? "Текущий тариф" : "Выбрать BUSINESS"}
        </button>
      </div>
    </div>
  );
}
