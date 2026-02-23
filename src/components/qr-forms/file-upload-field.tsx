"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  accept: string;
  workspaceId: string;
  onUploaded: (data: { fileUrl: string; fileId: string; filename: string }) => void;
  currentFilename?: string;
  /** Показывать превью загруженного изображения */
  currentFileUrl?: string;
};

export function FileUploadField({ accept, workspaceId, onUploaded, currentFilename, currentFileUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState(currentFilename ?? "");

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);

      try {
        const xhr = new XMLHttpRequest();
        const result = await new Promise<{ fileUrl: string; fileId: string; filename: string }>(
          (resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            });
            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const res = JSON.parse(xhr.responseText);
                  if (res?.ok && res?.data) {
                    const d = res.data;
                    resolve({
                      fileUrl: d.url ?? "",
                      fileId: String(d.fileId ?? ""),
                      filename: d.filename ?? file.name ?? d.key ?? "file",
                    });
                  } else {
                    reject(new Error("Некорректный ответ сервера"));
                  }
                } catch {
                  reject(new Error("Некорректный ответ сервера"));
                }
              } else {
                reject(new Error(`Ошибка загрузки: ${xhr.status}`));
              }
            });
            xhr.addEventListener("error", () => reject(new Error("Сетевая ошибка")));
            xhr.addEventListener("abort", () => reject(new Error("Загрузка отменена")));
            xhr.open("POST", "/api/upload");
            xhr.send(formData);
          },
        );

        setFilename(result.filename);
        onUploaded(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, onUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    },
    [upload],
  );

  return (
    <div className="space-y-2">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition cursor-pointer ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />

        {uploading ? (
          <div className="w-full space-y-2 text-center">
            <p className="text-sm text-slate-600">Загрузка... {progress}%</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : currentFileUrl && accept.startsWith("image") ? (
          <div className="text-center">
            <img src={currentFileUrl} alt="Превью" className="mx-auto max-h-24 rounded-lg object-contain" />
            <p className="mt-2 text-xs text-slate-500">Нажмите или перетащите для замены</p>
          </div>
        ) : filename ? (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">{filename}</p>
            <p className="mt-1 text-xs text-slate-500">Нажмите или перетащите для замены</p>
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600">
              Перетащите файл или нажмите для выбора
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
