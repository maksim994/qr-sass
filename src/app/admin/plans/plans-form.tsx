"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLAN_IDS, PLAN_DEFAULTS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const PLAN_NAMES: Record<PlanId, string> = {
  FREE: "Бесплатный",
  PRO: "Про",
  BUSINESS: "Бизнес",
};

type OverrideRow = {
  planId: string;
  maxQrCodes: number | null;
  maxUsers: number | null;
  priceRub: number | null;
};

type Props = {
  initialOverrides: Record<string, { maxQrCodes: number | null; maxUsers: number | null; priceRub?: number | null }>;
};

export function PlansForm({ initialOverrides }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const [state, setState] = useState<Record<string, OverrideRow>>(() => {
    const s: Record<string, OverrideRow> = {};
    for (const id of PLAN_IDS) {
      const def = PLAN_DEFAULTS[id];
      const ov = initialOverrides[id];
      s[id] = {
        planId: id,
        maxQrCodes: ov?.maxQrCodes ?? def.limits.maxQrCodes,
        maxUsers: ov?.maxUsers ?? def.limits.maxUsers,
        priceRub: ov?.priceRub ?? def.priceRub,
      };
    }
    return s;
  });

  async function save(planId: string) {
    setSaving(planId);
    try {
      const row = state[planId];
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          maxQrCodes: row.maxQrCodes === 0 ? 0 : row.maxQrCodes || null,
          maxUsers: row.maxUsers === 0 ? 0 : row.maxUsers || null,
          priceRub: row.priceRub === 0 ? 0 : row.priceRub || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка сохранения");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось сохранить") || "Не удалось сохранить");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {PLAN_IDS.map((planId) => (
        <div key={planId} className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">{PLAN_NAMES[planId]}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Цена, ₽/мес</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="0 = бесплатно"
                value={state[planId]?.priceRub != null ? state[planId].priceRub : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setState((s) => ({
                    ...s,
                    [planId]: {
                      ...s[planId],
                      priceRub: v === "" ? null : parseInt(v, 10) || 0,
                    },
                  }));
                }}
              />
            </div>
            <div>
              <label className="label">Макс. QR-кодов</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="Пусто = без лимита"
                value={state[planId]?.maxQrCodes != null ? state[planId].maxQrCodes : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setState((s) => ({
                    ...s,
                    [planId]: {
                      ...s[planId],
                      maxQrCodes: v === "" ? null : parseInt(v, 10) || 0,
                    },
                  }));
                }}
              />
            </div>
            <div>
              <label className="label">Макс. пользователей</label>
              <input
                type="number"
                min={0}
                className="input"
                placeholder="Пусто = без лимита"
                value={state[planId]?.maxUsers != null ? state[planId].maxUsers : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setState((s) => ({
                    ...s,
                    [planId]: {
                      ...s[planId],
                      maxUsers: v === "" ? null : parseInt(v, 10) || 0,
                    },
                  }));
              }}
            />
            </div>
            <div className="flex items-end gap-4">
              <button
                onClick={() => save(planId)}
                disabled={saving === planId}
                className="btn btn-primary"
              >
                {saving === planId ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
