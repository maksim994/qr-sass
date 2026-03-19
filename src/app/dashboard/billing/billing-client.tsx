"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { YookassaWidget } from "@/components/yookassa-widget";

export function BillingClient({ workspaceId, currentPlanId }: { workspaceId: string, currentPlanId: string }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

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
        <p className="mt-4 text-2xl font-bold text-slate-900 mb-6">990 ₽ <span className="text-sm font-normal text-slate-500">/ мес</span></p>
        <button 
          onClick={() => handleCheckout("PRO")}
          disabled={loading || currentPlanId === "PRO"}
          className="btn btn-primary w-full"
        >
          {currentPlanId === "PRO" ? "Текущий тариф" : "Выбрать PRO"}
        </button>
      </div>

      <div className={`card p-6 flex flex-col ${currentPlanId === "BUSINESS" ? "ring-2 ring-blue-600" : ""}`}>
        <h3 className="text-xl font-bold text-slate-900">BUSINESS</h3>
        <p className="mt-2 text-sm text-slate-500 flex-1">
          Для крупных проектов. Командная работа, API, кастомные домены.
        </p>
        <p className="mt-4 text-2xl font-bold text-slate-900 mb-6">2990 ₽ <span className="text-sm font-normal text-slate-500">/ мес</span></p>
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
