"use client";

import { useState } from "react";

type Props = {
  qrId: string;
  expireAt: Date | null;
  maxScans: number | null;
  passwordRequired: boolean;
  gdprRequired: boolean;
  gdprPolicyUrl: string | null;
  scanCount: number;
  onSaved?: () => void;
};

export default function QrExpirySettings({ qrId, expireAt, maxScans, passwordRequired, gdprRequired, gdprPolicyUrl, scanCount, onSaved }: Props) {
  const [expireAtVal, setExpireAtVal] = useState(
    expireAt ? expireAt.toISOString().slice(0, 16) : ""
  );
  const [maxScansVal, setMaxScansVal] = useState(
    maxScans != null ? String(maxScans) : ""
  );
  const [passwordVal, setPasswordVal] = useState("");
  const [gdprRequiredVal, setGdprRequiredVal] = useState(gdprRequired);
  const [gdprPolicyUrlVal, setGdprPolicyUrlVal] = useState(gdprPolicyUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        expireAt: expireAtVal || null,
        maxScans: maxScansVal ? Number(maxScansVal) : null,
      };
      if (passwordVal !== "") {
        body.password = passwordVal;
      } else if (passwordRequired) {
        body.password = null; // Clear password
      }
      body.gdprRequired = gdprRequiredVal;
      body.gdprPolicyUrl = gdprPolicyUrlVal || null;
      const res = await fetch(`/api/qr/${qrId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сохранить настройки.");
      }
      setMessage({ type: "ok", text: "Настройки сохранены." });
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
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="label">Действует до</label>
        <input
          type="datetime-local"
          value={expireAtVal}
          onChange={(e) => setExpireAtVal(e.target.value)}
          className="input"
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Оставьте пустым, если срок не ограничен
        </p>
      </div>
      <div>
        <label className="label">Максимум сканов</label>
        <input
          type="number"
          min={1}
          value={maxScansVal}
          onChange={(e) => setMaxScansVal(e.target.value)}
          placeholder="Без лимита"
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">
          Текущее количество: {scanCount}. Оставьте пустым для неограниченного
        </p>
      </div>
      <div>
        <label className="label">Пароль на QR</label>
        <input
          type="password"
          value={passwordVal}
          onChange={(e) => setPasswordVal(e.target.value)}
          placeholder={passwordRequired ? "Введите новый пароль или оставьте пустым чтобы убрать" : "Введите пароль для защиты"}
          className="input"
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-slate-500">
          {passwordRequired ? "Пароль установлен. Оставьте пустым чтобы убрать." : "Оставьте пустым, если пароль не нужен."}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={gdprRequiredVal}
            onChange={(e) => setGdprRequiredVal(e.target.checked)}
          />
          <span className="label mb-0">Требуется согласие GDPR</span>
        </label>
        {gdprRequiredVal && (
          <input
            type="url"
            value={gdprPolicyUrlVal}
            onChange={(e) => setGdprPolicyUrlVal(e.target.value)}
            placeholder="https://example.com/privacy"
            className="input"
          />
        )}
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
        {loading ? "Сохранение…" : "Сохранить"}
      </button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
