"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function TextForm({ payload, onChange }: Props) {
  return (
    <div>
      <label className="label">Текст</label>
      <textarea
        className="textarea"
        rows={4}
        value={String(payload.text || "")}
        onChange={(e) => onChange({ ...payload, text: e.target.value })}
        placeholder="Введите текст"
      />
    </div>
  );
}
