"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  onUploaded: (url: string) => void;
  currentUrl?: string;
};

export function CoverImageUpload({ onUploaded, currentUrl }: Props) {
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
        const res = await fetch("/api/admin/blog/upload", {
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
    [onUploaded],
  );

  return (
    <div className="space-y-2">
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
          uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type?.startsWith("image/")) upload(f);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
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
          <p className="text-sm text-slate-600">Загрузка и оптимизация…</p>
        ) : currentUrl ? (
          <div className="text-center">
            <img src={currentUrl} alt="Превью" className="mx-auto max-h-32 rounded-lg object-contain" />
            <p className="mt-2 text-xs text-slate-500">Нажмите или перетащите для замены</p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600">Перетащите изображение или нажмите для выбора</p>
            <p className="mt-1 text-xs text-slate-400">JPEG, PNG, GIF, WebP. Будут оптимизированы и загружены на S3.</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
