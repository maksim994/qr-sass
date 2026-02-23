"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function UrlForm({ payload, onChange }: Props) {
  return (
    <div>
      <label className="label">URL-адрес</label>
      <input
        className="input"
        type="url"
        value={String(payload.url || "")}
        onChange={(e) => onChange({ ...payload, url: e.target.value })}
        placeholder="https://example.com"
      />
    </div>
  );
}
