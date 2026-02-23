"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function CouponForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Заголовок</label>
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Скидка 20% на всё"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Описание</label>
        <textarea
          className="textarea"
          rows={2}
          value={String(payload.description || "")}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Подробности акции"
        />
      </div>
      <div>
        <label className="label">Скидка</label>
        <input
          className="input"
          value={String(payload.discount || "")}
          onChange={(e) => set("discount", e.target.value)}
          placeholder="20%"
        />
      </div>
      <div>
        <label className="label">Промокод</label>
        <input
          className="input"
          value={String(payload.code || "")}
          onChange={(e) => set("code", e.target.value)}
          placeholder="SALE2025"
        />
      </div>
      <div>
        <label className="label">Срок действия</label>
        <input
          className="input"
          type="date"
          value={String(payload.expiryDate || "")}
          onChange={(e) => set("expiryDate", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Условия</label>
        <input
          className="input"
          value={String(payload.terms || "")}
          onChange={(e) => set("terms", e.target.value)}
          placeholder="Условия использования"
        />
      </div>
    </div>
  );
}
