"use client";

import { useCallback, useState } from "react";
import { FileUploadField } from "./file-upload-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  workspaceId: string;
};

type Mode = "upload" | "youtube";

export function VideoForm({ payload, onChange, workspaceId }: Props) {
  const [mode, setMode] = useState<Mode>(
    payload.videoUrl ? "youtube" : "upload",
  );

  const handleUploaded = useCallback(
    (data: { fileUrl: string; fileId: string; filename: string }) => {
      onChange({
        ...payload,
        fileUrl: data.fileUrl,
        fileId: data.fileId,
        filename: data.filename,
        videoUrl: "",
      });
    },
    [payload, onChange],
  );

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">Название</label>
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Название видео"
        />
      </div>

      <div>
        <label className="label">Источник видео</label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn btn-sm ${mode === "upload" ? "btn-primary" : ""}`}
            onClick={() => setMode("upload")}
          >
            Загрузить файл
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === "youtube" ? "btn-primary" : ""}`}
            onClick={() => setMode("youtube")}
          >
            Ссылка YouTube
          </button>
        </div>
      </div>

      {mode === "youtube" ? (
        <div>
          <label className="label">URL видео (YouTube)</label>
          <input
            className="input"
            type="url"
            value={String(payload.videoUrl || "")}
            onChange={(e) =>
              onChange({
                ...payload,
                videoUrl: e.target.value,
                fileUrl: "",
                fileId: "",
                filename: "",
              })
            }
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
      ) : (
        <div>
          <label className="label">Видеофайл</label>
          <FileUploadField
            accept="video/*"
            workspaceId={workspaceId}
            onUploaded={handleUploaded}
            currentFilename={String(payload.filename || "")}
          />
        </div>
      )}
    </div>
  );
}
