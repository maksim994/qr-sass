"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function UrlForm({ payload, onChange }: Props) {
  return (
    <FormField label="URL-адрес">
      <input
        className="input"
        type="url"
        value={String(payload.url || "")}
        onChange={(e) => onChange({ ...payload, url: e.target.value })}
        placeholder="https://example.com"
      />
    </FormField>
  );
}
