"use client";

import { FormField } from "./form-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function VcardForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) => onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Имя">
        <input className="input" value={String(payload.firstName || "")} onChange={(e) => set("firstName", e.target.value)} placeholder="Иван" />
      </FormField>
      <FormField label="Фамилия">
        <input className="input" value={String(payload.lastName || "")} onChange={(e) => set("lastName", e.target.value)} placeholder="Иванов" />
      </FormField>
      <FormField label="Организация">
        <input className="input" value={String(payload.organization || "")} onChange={(e) => set("organization", e.target.value)} placeholder="ООО Компания" />
      </FormField>
      <FormField label="Должность">
        <input className="input" value={String(payload.title || "")} onChange={(e) => set("title", e.target.value)} placeholder="Менеджер" />
      </FormField>
      <FormField label="Телефон">
        <input className="input" type="tel" value={String(payload.phone || "")} onChange={(e) => set("phone", e.target.value)} placeholder="+7 999 123 45 67" />
      </FormField>
      <FormField label="Email">
        <input className="input" type="email" value={String(payload.email || "")} onChange={(e) => set("email", e.target.value)} placeholder="ivan@example.com" />
      </FormField>
      <FormField label="Сайт">
        <input className="input" type="url" value={String(payload.website || "")} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" />
      </FormField>
      <FormField label="Адрес">
        <input className="input" value={String(payload.address || "")} onChange={(e) => set("address", e.target.value)} placeholder="г. Москва, ул. Примерная, 1" />
      </FormField>
    </div>
  );
}
