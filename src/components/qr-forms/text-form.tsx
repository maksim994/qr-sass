"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function TextForm({ payload, onChange }: Props) {
  return (
    <FormField label="Текст">
      <textarea
        className="textarea"
        rows={4}
        value={String(payload.text || "")}
        onChange={(e) => onChange({ ...payload, text: e.target.value })}
        placeholder="Введите текст"
      />
    </FormField>
  );
}
