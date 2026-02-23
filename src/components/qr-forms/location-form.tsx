"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function LocationForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Широта</label>
        <input
          className="input"
          type="number"
          step="any"
          value={String(payload.latitude || "")}
          onChange={(e) => set("latitude", e.target.value)}
          placeholder="55.7558"
        />
      </div>
      <div>
        <label className="label">Долгота</label>
        <input
          className="input"
          type="number"
          step="any"
          value={String(payload.longitude || "")}
          onChange={(e) => set("longitude", e.target.value)}
          placeholder="37.6173"
        />
      </div>
    </div>
  );
}
