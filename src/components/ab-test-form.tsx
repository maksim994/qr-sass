"use client";

import { useState } from "react";

type AbTest = {
  urlA?: string;
  urlB?: string;
};

type Props = {
  qrId: string;
  abTest: AbTest | null;
  scanCountA: number;
  scanCountB: number;
  onSaved?: () => void;
};

export default function AbTestForm({ qrId, abTest, scanCountA, scanCountB, onSaved }: Props) {
  const [urlA, setUrlA] = useState(abTest?.urlA ?? "");
  const [urlB, setUrlB] = useState(abTest?.urlB ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const hasAbTest = abTest?.urlA && abTest?.urlB;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/qr/${qrId}/ab-test`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlA: urlA.trim() || null,
          urlB: urlB.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить.");
      }
      setMessage({ type: "ok", text: "A/B тест сохранён." });
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
        Случайный выбор URL (50/50). Cookie сохраняет вариант при повторных визитах.
      </p>
      {hasAbTest && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">Метрики конверсии</p>
          <div className="mt-2 flex gap-6">
            <span>Вариант A: {scanCountA} сканов</span>
            <span>Вариант B: {scanCountB} сканов</span>
          </div>
        </div>
      )}
      <div>
        <label className="label">URL вариант A</label>
        <input
          type="url"
          value={urlA}
          onChange={(e) => setUrlA(e.target.value)}
          placeholder="https://example.com/a"
          className="input"
        />
      </div>
      <div>
        <label className="label">URL вариант B</label>
        <input
          type="url"
          value={urlB}
          onChange={(e) => setUrlB(e.target.value)}
          placeholder="https://example.com/b"
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
