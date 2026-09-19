"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function LocationForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) => onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Широта">
        <input
          className="input"
          type="number"
          step="any"
          value={String(payload.latitude || "")}
          onChange={(e) => set("latitude", e.target.value)}
          placeholder="55.7558"
        />
      </FormField>
      <FormField label="Долгота">
        <input
          className="input"
          type="number"
          step="any"
          value={String(payload.longitude || "")}
          onChange={(e) => set("longitude", e.target.value)}
          placeholder="37.6173"
        />
      </FormField>
    </div>
  );
}
