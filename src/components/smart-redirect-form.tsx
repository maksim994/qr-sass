"use client";

import { useState } from "react";

type SmartRedirect = {
  default?: string;
  ios?: string;
  android?: string;
  desktop?: string;
};

type Props = {
  qrId: string;
  smartRedirect: SmartRedirect | null;
  onSaved?: () => void;
};

export default function SmartRedirectForm({ qrId, smartRedirect, onSaved }: Props) {
  const [defaultUrl, setDefaultUrl] = useState(smartRedirect?.default ?? "");
  const [iosUrl, setIosUrl] = useState(smartRedirect?.ios ?? "");
  const [androidUrl, setAndroidUrl] = useState(smartRedirect?.android ?? "");
  const [desktopUrl, setDesktopUrl] = useState(smartRedirect?.desktop ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/qr/${qrId}/smart-redirect`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default: defaultUrl || null,
          ios: iosUrl || null,
          android: androidUrl || null,
          desktop: desktopUrl || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить.");
      }
      setMessage({ type: "ok", text: "Smart redirect сохранён." });
      onSaved?.();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Произошла ошибка.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <p className="text-xs text-slate-500">
        Разные URL для iOS, Android и Desktop. Оставьте пустым для использования основного URL.
      </p>
      <div>
        <label className="label">По умолчанию</label>
        <input
          type="url"
          value={defaultUrl}
          onChange={(e) => setDefaultUrl(e.target.value)}
          placeholder="https://example.com"
          className="input"
        />
      </div>
      <div>
        <label className="label">iOS (App Store)</label>
        <input
          type="url"
          value={iosUrl}
          onChange={(e) => setIosUrl(e.target.value)}
          placeholder="https://apps.apple.com/..."
          className="input"
        />
      </div>
      <div>
        <label className="label">Android (Play Store)</label>
        <input
          type="url"
          value={androidUrl}
          onChange={(e) => setAndroidUrl(e.target.value)}
          placeholder="https://play.google.com/..."
          className="input"
        />
      </div>
      <div>
        <label className="label">Desktop</label>
        <input
          type="url"
          value={desktopUrl}
          onChange={(e) => setDesktopUrl(e.target.value)}
          placeholder="https://example.com/desktop"
          className="input"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
        {loading ? "Сохранение…" : "Сохранить"}
      </button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
