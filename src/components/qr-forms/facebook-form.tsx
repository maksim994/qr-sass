"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function FacebookForm({ payload, onChange }: Props) {
  return (
    <div>
      <label className="label">URL страницы Facebook</label>
      <input
        className="input"
        type="url"
        value={String(payload.pageUrl || "")}
        onChange={(e) => onChange({ ...payload, pageUrl: e.target.value })}
        placeholder="https://facebook.com/yourpage"
      />
    </div>
  );
}
