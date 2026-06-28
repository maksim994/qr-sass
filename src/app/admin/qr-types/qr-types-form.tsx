"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { groupLabels, qrTypes } from "@/lib/qr-types";
import { QrContentType } from "@prisma/client";

const groups = ["basic", "files", "business", "social"] as const;

type Props = {
  initialDisabled: QrContentType[];
};

export function QrTypesForm({ initialDisabled }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [disabled, setDisabled] = useState<Set<QrContentType>>(() => new Set(initialDisabled));

  function isEnabled(type: QrContentType) {
    return !disabled.has(type);
  }

  function toggle(type: QrContentType, enabled: boolean) {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function setGroupEnabled(group: (typeof groups)[number], enabled: boolean) {
    setDisabled((prev) => {
      const next = new Set(prev);
      for (const item of qrTypes.filter((t) => t.group === group)) {
        if (enabled) next.delete(item.type);
        else next.add(item.type);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchApi("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ disabledQrTypes: [...disabled] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка сохранения");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось сохранить") || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = qrTypes.length - disabled.size;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="text-sm text-slate-600">
        Отключённые типы скрываются на странице создания QR-кода. Уже созданные QR-коды продолжают
        работать. Доступно для создания:{" "}
        <span className="font-semibold text-slate-900">
          {enabledCount} из {qrTypes.length}
        </span>
        .
      </p>

      {groups.map((group) => {
        const items = qrTypes.filter((t) => t.group === group);
        const groupEnabledCount = items.filter((t) => isEnabled(t.type)).length;

        return (
          <section key={group} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  {groupLabels[group]}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Включено {groupEnabledCount} из {items.length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() => setGroupEnabled(group, true)}
                >
                  Включить все
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() => setGroupEnabled(group, false)}
                >
                  Отключить все
                </button>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.type} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {isEnabled(item.type) ? "Вкл." : "Выкл."}
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isEnabled(item.type)}
                      onChange={(e) => toggle(item.type, e.target.checked)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
