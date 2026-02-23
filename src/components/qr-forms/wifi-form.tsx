"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function WifiForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Имя сети (SSID)</label>
        <input
          className="input"
          value={String(payload.ssid || "")}
          onChange={(e) => set("ssid", e.target.value)}
          placeholder="MyNetwork"
        />
      </div>
      <div>
        <label className="label">Пароль</label>
        <input
          className="input"
          type="password"
          value={String(payload.password || "")}
          onChange={(e) => set("password", e.target.value)}
          placeholder="Пароль сети"
        />
      </div>
      <div>
        <label className="label">Тип шифрования</label>
        <select
          className="select"
          value={String(payload.encryption || "WPA")}
          onChange={(e) => set("encryption", e.target.value)}
        >
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">Без пароля</option>
        </select>
      </div>
    </div>
  );
}
