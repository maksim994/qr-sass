"use client";

import { useCallback } from "react";
import { FileUploadField } from "./file-upload-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  workspaceId: string;
};

export function Mp3Form({ payload, onChange, workspaceId }: Props) {
  const handleUploaded = useCallback(
    (data: { fileUrl: string; fileId: string; filename: string }) => {
      onChange({ ...payload, fileUrl: data.fileUrl, fileId: data.fileId, filename: data.filename });
    },
    [payload, onChange],
  );

  return (
    <div className="grid gap-4">
      <div>
        <label className="label">Название трека</label>
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Название"
        />
      </div>
      <div>
        <label className="label">Исполнитель</label>
        <input
          className="input"
          value={String(payload.artist || "")}
          onChange={(e) => onChange({ ...payload, artist: e.target.value })}
          placeholder="Имя исполнителя"
        />
      </div>
      <div>
        <label className="label">Аудиофайл</label>
        <FileUploadField
          accept="audio/*"
          workspaceId={workspaceId}
          onUploaded={handleUploaded}
          currentFilename={String(payload.filename || "")}
        />
      </div>
    </div>
  );
}
