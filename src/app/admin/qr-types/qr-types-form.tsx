"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { groupLabels, qrTypes } from "@/lib/qr-types";
import { QrContentType } from "@prisma/client";
import { Alert, Button } from "@/components/ui";

const groups = ["basic", "files", "business", "social"] as const;

type Props = {
  initialDisabled: QrContentType[];
};

export function QrTypesForm({ initialDisabled }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = qrTypes.length - disabled.size;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <p style={{ font: "var(--fw-regular) 14px/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
        Отключённые типы скрываются на странице создания QR-кода. Уже созданные QR-коды продолжают
        работать. Доступно для создания:{" "}
        <strong style={{ color: "var(--text-strong)" }}>
          {enabledCount} из {qrTypes.length}
        </strong>
        .
      </p>

      {groups.map((group) => {
        const items = qrTypes.filter((t) => t.group === group);
        const groupEnabledCount = items.filter((t) => isEnabled(t.type)).length;

        return (
          <section key={group} className="qrs-admin-form-section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 style={{ font: "var(--fw-bold) 12px/1 var(--font-sans)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {groupLabels[group]}
                </h2>
                <p style={{ marginTop: 4, font: "var(--fw-medium) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
                  Включено {groupEnabledCount} из {items.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setGroupEnabled(group, true)}>
                  Включить все
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setGroupEnabled(group, false)}>
                  Отключить все
                </Button>
              </div>
            </div>

            <ul className="qrs-admin-toggle-list">
              {items.map((item) => (
                <li key={item.type} className="qrs-admin-toggle-list__item">
                  <div className="min-w-0">
                    <p style={{ font: "var(--fw-semibold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>{item.label}</p>
                    <p style={{ marginTop: 2, font: "var(--fw-regular) 12px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{item.description}</p>
                  </div>
                  <label className="fk-choice fk-choice--checkbox shrink-0">
                    <input
                      type="checkbox"
                      className="fk-choice__input"
                      checked={isEnabled(item.type)}
                      onChange={(e) => toggle(item.type, e.target.checked)}
                    />
                    <span className="fk-choice__box" aria-hidden="true">
                      <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="fk-choice__text" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {isEnabled(item.type) ? "Вкл." : "Выкл."}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Button type="submit" disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить"}
      </Button>
    </form>
  );
}
