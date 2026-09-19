"use client";
import { fetchApi } from "@/lib/client-api";
import { useState } from "react";
import { FormField } from "@/components/qr-forms/form-field";

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
      const res = await fetchApi(`/api/qr/${qrId}/smart-redirect`, {
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
      setMessage({ type: "ok", text: "Умный редирект сохранён." });
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
      <p className="text-xs qrs-text-muted">
        Разные URL для iOS, Android и Desktop. Оставьте пустым для использования основного URL.
      </p>
      <FormField label="По умолчанию">
        <input
          type="url"
          value={defaultUrl}
          onChange={(e) => setDefaultUrl(e.target.value)}
          placeholder="https://example.com"
          className="input"
        />
      </FormField>
      <FormField label="iOS (App Store)">
        <input
          type="url"
          value={iosUrl}
          onChange={(e) => setIosUrl(e.target.value)}
          placeholder="https://apps.apple.com/..."
          className="input"
        />
      </FormField>
      <FormField label="Android (Play Store)">
        <input
          type="url"
          value={androidUrl}
          onChange={(e) => setAndroidUrl(e.target.value)}
          placeholder="https://play.google.com/..."
          className="input"
        />
      </FormField>
      <FormField label="Desktop">
        <input
          type="url"
          value={desktopUrl}
          onChange={(e) => setDesktopUrl(e.target.value)}
          placeholder="https://example.com/desktop"
          className="input"
        />
      </FormField>
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
        {loading ? "Сохранение…" : "Сохранить"}
      </button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
