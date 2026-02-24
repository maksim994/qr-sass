"use client";

import { useState } from "react";

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
  const [metaPixelId, setMetaPixelId] = useState(trackingPixels?.metaPixelId ?? "");
  const [ga4Id, setGa4Id] = useState(trackingPixels?.ga4Id ?? "");
  const [gtmId, setGtmId] = useState(trackingPixels?.gtmId ?? "");
  const [ymCounterId, setYmCounterId] = useState(trackingPixels?.ymCounterId ?? "");
  const [vkPixelId, setVkPixelId] = useState(trackingPixels?.vkPixelId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/qr/${qrId}/tracking-pixels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPixelId: metaPixelId.trim() || null,
          ga4Id: ga4Id.trim() || null,
          gtmId: gtmId.trim() || null,
          ymCounterId: ymCounterId.trim() || null,
          vkPixelId: vkPixelId.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить.");
      }
      setMessage({ type: "ok", text: "Retargeting pixels сохранены." });
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
        Meta Pixel, GA4, GTM, Яндекс Метрика и VK Пиксель будут загружены на странице перед редиректом. Редирект задерживается на 150 мс.
      </p>
      <div>
        <label className="label">Meta Pixel ID</label>
        <input
          type="text"
          value={metaPixelId}
          onChange={(e) => setMetaPixelId(e.target.value)}
          placeholder="1234567890123456"
          className="input"
        />
      </div>
      <div>
        <label className="label">GA4 Measurement ID</label>
        <input
          type="text"
          value={ga4Id}
          onChange={(e) => setGa4Id(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          className="input"
        />
      </div>
      <div>
        <label className="label">Google Tag Manager ID</label>
        <input
          type="text"
          value={gtmId}
          onChange={(e) => setGtmId(e.target.value)}
          placeholder="GTM-XXXXXXX"
          className="input"
        />
      </div>
      <div>
        <label className="label">Яндекс Метрика (ID счётчика)</label>
        <input
          type="text"
          value={ymCounterId}
          onChange={(e) => setYmCounterId(e.target.value)}
          placeholder="12345678"
          className="input"
        />
      </div>
      <div>
        <label className="label">VK Пиксель (ID)</label>
        <input
          type="text"
          value={vkPixelId}
          onChange={(e) => setVkPixelId(e.target.value)}
          placeholder="VK-RTRG-162959-XXXXX"
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">ID из раздела Ретаргетинг → Пиксели в VK Рекламе</p>
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
