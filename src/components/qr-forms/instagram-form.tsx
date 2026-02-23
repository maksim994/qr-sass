"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function InstagramForm({ payload, onChange }: Props) {
  return (
    <div>
      <label className="label">Имя пользователя Instagram</label>
      <input
        className="input"
        value={String(payload.username || "")}
        onChange={(e) => onChange({ ...payload, username: e.target.value })}
        placeholder="username"
      />
    </div>
  );
}
