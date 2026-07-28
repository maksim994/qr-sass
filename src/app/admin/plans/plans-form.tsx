"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { PLAN_IDS, PLAN_DEFAULTS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { Alert, Button, Field, Input } from "@/components/ui";

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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const row = state[planId];
      const res = await fetchApi(`/api/admin/plans/${planId}`, {
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
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {PLAN_IDS.map((planId) => (
        <section
          key={planId}
          className="qrs-admin-form-section"
        >
          <h2 style={{ font: "var(--fw-bold) 1.1rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
            {PLAN_NAMES[planId]}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Цена, ₽/мес" htmlFor={`price-${planId}`}>
              <Input
                id={`price-${planId}`}
                type="number"
                min={0}
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
            </Field>
            <Field label="Макс. QR-кодов" htmlFor={`qr-${planId}`} hint="Пусто = без лимита">
              <Input
                id={`qr-${planId}`}
                type="number"
                min={0}
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
            </Field>
            <Field label="Макс. пользователей" htmlFor={`users-${planId}`} hint="Пусто = без лимита">
              <Input
                id={`users-${planId}`}
                type="number"
                min={0}
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
            </Field>
            <div className="flex items-end">
              <Button type="button" onClick={() => save(planId)} disabled={saving === planId}>
                {saving === planId ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
