"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function FacebookForm({ payload, onChange }: Props) {
  return (
    <FormField label="URL страницы Facebook">
      <input
        className="input"
        type="url"
        value={String(payload.pageUrl || "")}
        onChange={(e) => onChange({ ...payload, pageUrl: e.target.value })}
        placeholder="https://facebook.com/yourpage"
      />
    </FormField>
  );
}
