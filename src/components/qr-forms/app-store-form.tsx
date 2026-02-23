"use client";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
};

export function AppStoreForm({ payload, onChange }: Props) {
  const set = (field: string, value: string) =>
    onChange({ ...payload, [field]: value });

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">Название приложения</label>
        <input
          className="input"
          value={String(payload.appName || "")}
          onChange={(e) => set("appName", e.target.value)}
          placeholder="Моё приложение"
        />
      </div>
      <div>
        <label className="label">Ссылка App Store (iOS)</label>
        <input
          className="input"
          type="url"
          value={String(payload.iosUrl || "")}
          onChange={(e) => set("iosUrl", e.target.value)}
          placeholder="https://apps.apple.com/app/..."
        />
      </div>
      <div>
        <label className="label">Ссылка Google Play (Android)</label>
        <input
          className="input"
          type="url"
          value={String(payload.androidUrl || "")}
          onChange={(e) => set("androidUrl", e.target.value)}
          placeholder="https://play.google.com/store/apps/..."
        />
      </div>
    </div>
  );
}
