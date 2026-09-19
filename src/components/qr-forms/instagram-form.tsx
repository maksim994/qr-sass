"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function InstagramForm({ payload, onChange }: Props) {
  return (
    <FormField label="Имя пользователя Instagram">
      <input
        className="input"
        value={String(payload.username || "")}
        onChange={(e) => onChange({ ...payload, username: e.target.value })}
        placeholder="username"
      />
    </FormField>
  );
}
