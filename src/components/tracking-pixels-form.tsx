"use client";
import { fetchApi } from "@/lib/client-api";
import { useState } from "react";
import { FormField } from "@/components/qr-forms/form-field";

type TrackingPixels = {
  metaPixelId?: string;
  ga4Id?: string;
  gtmId?: string;
  ymCounterId?: string;
  vkPixelId?: string;
};

type Props = {
  qrId: string;
  trackingPixels: TrackingPixels | null;
  onSaved?: () => void;
};

export default function TrackingPixelsForm({ qrId, trackingPixels, onSaved }: Props) {
  const [ymCounterId, setYmCounterId] = useState(trackingPixels?.ymCounterId ?? "");
  const [vkPixelId, setVkPixelId] = useState(trackingPixels?.vkPixelId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchApi(`/api/qr/${qrId}/tracking-pixels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPixelId: trackingPixels?.metaPixelId?.trim() || null,
          ga4Id: trackingPixels?.ga4Id?.trim() || null,
          ymCounterId: ymCounterId.trim() || null,
          vkPixelId: vkPixelId.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить.");
      }
      setMessage({ type: "ok", text: "Пиксели ретаргетинга сохранены." });
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
        Подключите Яндекс Метрику или VK Пиксель для отслеживания переходов из QR-кода.
      </p>
      <FormField label="Яндекс Метрика (ID счётчика)">
        <input
          type="text"
          value={ymCounterId}
          onChange={(e) => setYmCounterId(e.target.value)}
          placeholder="12345678"
          className="input"
        />
      </FormField>
      <FormField label="VK Пиксель (ID)" hint="ID из раздела Ретаргетинг → Пиксели в VK Рекламе">
        <input
          type="text"
          value={vkPixelId}
          onChange={(e) => setVkPixelId(e.target.value)}
          placeholder="VK-RTRG-162959-XXXXX"
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
