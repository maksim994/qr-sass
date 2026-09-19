"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function WhatsappForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) => onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4">
      <FormField label="Номер телефона">
        <input
          className="input"
          type="tel"
          value={String(payload.phone || "")}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+7 999 123 45 67"
        />
      </FormField>
      <FormField label="Сообщение">
        <textarea
          className="textarea"
          rows={3}
          value={String(payload.message || "")}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Текст сообщения"
        />
      </FormField>
    </div>
  );
}
