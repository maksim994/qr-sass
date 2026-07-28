"use client";

import { fetchApi } from "@/lib/client-api";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui";

type Props = {
  workspaceId: string;
  bulkLimit: number;
};

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function BulkUploadClient({ workspaceId, bulkLimit }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    setFile(next);
    setError("");
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

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
      const res = await fetchApi("/api/qr/bulk", {
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
      pickFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="qrs-bulk-card">
      <div className="qrs-bulk-card-title">Файл CSV или Excel</div>

      <label
        className={`qrs-drop${dragActive ? " active" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget === e.target) setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <span className="qrs-drop-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
          </svg>
        </span>
        <span style={{ font: "var(--fw-semibold) 15px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
          Перетащите файл сюда или{" "}
          <span style={{ color: "var(--color-primary)" }}>выберите на диске</span>
        </span>
        <span style={{ font: "var(--fw-medium) 13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
          .csv, .xlsx — максимум {bulkLimit} строк за один раз
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileInput}
          disabled={loading}
          style={{ display: "none" }}
        />
      </label>

      <div className="qrs-bulk-actions">
        <button type="submit" disabled={loading || !file} className="fk-button fk-button--primary">
          {loading ? "Создание и ZIP…" : "Создать и скачать ZIP"}
        </button>
        <span className="qrs-bulk-file-status">{file ? file.name : "Файл не выбран"}</span>
      </div>

      {error && (
        <Alert variant="danger" title="Ошибка загрузки" onClose={() => setError("")} className="mt-3">
          {error}
        </Alert>
      )}
    </form>
  );
}
