"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function CouponForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) => onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Заголовок" className="sm:col-span-2">
        <input className="input" value={String(payload.title || "")} onChange={(e) => set("title", e.target.value)} placeholder="Скидка 20% на всё" />
      </FormField>
      <FormField label="Описание" className="sm:col-span-2">
        <textarea className="textarea" rows={2} value={String(payload.description || "")} onChange={(e) => set("description", e.target.value)} placeholder="Подробности акции" />
      </FormField>
      <FormField label="Скидка">
        <input className="input" value={String(payload.discount || "")} onChange={(e) => set("discount", e.target.value)} placeholder="20%" />
      </FormField>
      <FormField label="Промокод">
        <input className="input" value={String(payload.code || "")} onChange={(e) => set("code", e.target.value)} placeholder="SALE2025" />
      </FormField>
      <FormField label="Срок действия">
        <input className="input" type="date" value={String(payload.expiryDate || "")} onChange={(e) => set("expiryDate", e.target.value)} />
      </FormField>
      <FormField label="Условия">
        <input className="input" value={String(payload.terms || "")} onChange={(e) => set("terms", e.target.value)} placeholder="Условия использования" />
      </FormField>
    </div>
  );
}
