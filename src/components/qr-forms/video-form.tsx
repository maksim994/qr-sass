"use client";

import { useCallback, useState } from "react";
import { FileUploadField } from "./file-upload-field";
import { FormField } from "./form-field";

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
      <FormField label="Название">
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Название видео"
        />
      </FormField>

      <div>
        <p className="label" id="video-source-label">Источник видео</p>
        <div className="flex gap-2" role="group" aria-labelledby="video-source-label">
          <button
            type="button"
            className={`btn btn-sm ${mode === "upload" ? "btn-primary" : ""}`}
            aria-pressed={mode === "upload"}
            onClick={() => setMode("upload")}
          >
            Загрузить файл
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === "youtube" ? "btn-primary" : ""}`}
            aria-pressed={mode === "youtube"}
            onClick={() => setMode("youtube")}
          >
            Ссылка YouTube
          </button>
        </div>
      </div>

      {mode === "youtube" ? (
        <FormField label="URL видео (YouTube)">
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
        </FormField>
      ) : (
        <div>
          <p className="label" id="video-file-label">Видеофайл</p>
          <FileUploadField
            accept="video/*"
            workspaceId={workspaceId}
            onUploaded={handleUploaded}
            currentFilename={String(payload.filename || "")}
            labelledBy="video-file-label"
          />
        </div>
      )}
    </div>
  );
}
