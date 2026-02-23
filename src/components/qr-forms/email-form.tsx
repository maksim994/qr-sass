"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function EmailForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={String(payload.email || "")}
          onChange={(e) => set("email", e.target.value)}
          placeholder="name@example.com"
        />
      </div>
      <div>
        <label className="label">Тема</label>
        <input
          className="input"
          value={String(payload.subject || "")}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="Тема письма"
        />
      </div>
      <div>
        <label className="label">Текст письма</label>
        <textarea
          className="textarea"
          rows={3}
          value={String(payload.body || "")}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Текст сообщения"
        />
      </div>
    </div>
  );
}
