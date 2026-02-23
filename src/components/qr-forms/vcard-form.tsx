"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function VcardForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Имя</label>
        <input
          className="input"
          value={String(payload.firstName || "")}
          onChange={(e) => set("firstName", e.target.value)}
          placeholder="Иван"
        />
      </div>
      <div>
        <label className="label">Фамилия</label>
        <input
          className="input"
          value={String(payload.lastName || "")}
          onChange={(e) => set("lastName", e.target.value)}
          placeholder="Иванов"
        />
      </div>
      <div>
        <label className="label">Организация</label>
        <input
          className="input"
          value={String(payload.organization || "")}
          onChange={(e) => set("organization", e.target.value)}
          placeholder="ООО Компания"
        />
      </div>
      <div>
        <label className="label">Должность</label>
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Менеджер"
        />
      </div>
      <div>
        <label className="label">Телефон</label>
        <input
          className="input"
          type="tel"
          value={String(payload.phone || "")}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+7 999 123 45 67"
        />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={String(payload.email || "")}
          onChange={(e) => set("email", e.target.value)}
          placeholder="ivan@example.com"
        />
      </div>
      <div>
        <label className="label">Сайт</label>
        <input
          className="input"
          type="url"
          value={String(payload.website || "")}
          onChange={(e) => set("website", e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="label">Адрес</label>
        <input
          className="input"
          value={String(payload.address || "")}
          onChange={(e) => set("address", e.target.value)}
          placeholder="г. Москва, ул. Примерная, 1"
        />
      </div>
    </div>
  );
}
