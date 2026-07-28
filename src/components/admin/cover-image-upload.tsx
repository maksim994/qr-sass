"use client";

import { fetchApi } from "@/lib/client-api";
import { useCallback, useRef, useState } from "react";
import { Alert } from "@/components/ui";

type Props = {
  onUploaded: (url: string) => void;
  currentUrl?: string;
  uploadEndpoint?: string;
};

export function CoverImageUpload({
  onUploaded,
  currentUrl,
  uploadEndpoint = "/api/admin/blog/upload",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetchApi(uploadEndpoint, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Ошибка загрузки");
        onUploaded(json.data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, uploadEndpoint],
  );

  return (
    <div className="space-y-2">
      <div
        className={`qrs-upload-zone${uploading ? " qrs-upload-zone--active" : ""}`}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type?.startsWith("image/")) upload(f);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        {uploading ? (
          <p style={{ font: "var(--fw-medium) 14px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>Загрузка и оптимизация…</p>
        ) : currentUrl ? (
          <div className="text-center">
            <img src={currentUrl} alt="Превью" className="mx-auto max-h-32 rounded-lg object-contain" />
            <p style={{ marginTop: 8, font: "var(--fw-medium) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
              Нажмите или перетащите для замены
            </p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              style={{ color: "var(--text-muted)" }}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p style={{ marginTop: 8, font: "var(--fw-medium) 14px/1.4 var(--font-sans)", color: "var(--text-default)" }}>
              Перетащите изображение или нажмите для выбора
            </p>
            <p style={{ marginTop: 4, font: "var(--fw-regular) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>
              JPEG, PNG, GIF, WebP. Будут оптимизированы и загружены на S3.
            </p>
          </div>
        )}
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
