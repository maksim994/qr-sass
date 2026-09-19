"use client";
import { fetchApi } from "@/lib/client-api";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MSG } from "@/lib/user-messages";
import { FormField } from "@/components/qr-forms/form-field";

type Props = {
  qrId: string;
  currentUrl: string | null;
};

export default function UpdateTarget({ qrId, currentUrl }: Props) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const router = useRouter();
  const pending = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetchApi(`/api/qr/${qrId}/target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? MSG.COULD_NOT_UPDATE_TARGET);
      }

      setMessage({ type: "ok", text: "URL успешно обновлён." });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : MSG.UNEXPECTED_RESPONSE,
      });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <FormField label="Целевой URL">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="input"
        />
      </FormField>
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm mt-2">
        {loading ? "Сохранение…" : "Сохранить"}
      </button>
      {message && (
        <p role={message.type === "err" ? "alert" : "status"} className={`mt-2 text-sm ${message.type === "ok" ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
