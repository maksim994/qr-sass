"use client";

import { useState } from "react";

type Props = {
  qrId: string;
  currentUrl: string | null;
};

export default function UpdateTarget({ qrId, currentUrl }: Props) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/qr/${qrId}/target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось обновить URL.");
      }

      setMessage({ type: "ok", text: "URL успешно обновлён." });
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
    <form onSubmit={handleSubmit} className="mt-4">
      <label className="label">Целевой URL</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="input"
        />
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm shrink-0">
          {loading ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
