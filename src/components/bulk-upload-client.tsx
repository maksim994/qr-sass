"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  workspaceId: string;
  bulkLimit: number;
};

export function BulkUploadClient({ workspaceId, bulkLimit }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Выберите файл");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("workspaceId", workspaceId);
      const res = await fetch("/api/qr/bulk", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка при создании QR-кодов.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-codes.zip";
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
      setFile(null);
      if (formRef.current) formRef.current.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card p-6">
      <label className="label">Файл CSV или Excel</label>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError("");
        }}
        className="input block w-full"
        disabled={loading}
      />
      <p className="mt-2 text-xs text-slate-500">
        Максимум {bulkLimit} строк за один раз.
      </p>
      <button
        type="submit"
        disabled={loading || !file}
        className="btn btn-primary mt-4"
      >
        {loading ? "Создание и ZIP…" : "Создать и скачать ZIP"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}
