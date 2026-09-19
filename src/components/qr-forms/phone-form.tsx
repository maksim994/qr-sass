"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function PhoneForm({ payload, onChange }: Props) {
  return (
    <FormField label="Номер телефона">
      <input
        className="input"
        type="tel"
        value={String(payload.phone || "")}
        onChange={(e) => onChange({ ...payload, phone: e.target.value })}
        placeholder="+7 999 123 45 67"
      />
    </FormField>
  );
}
