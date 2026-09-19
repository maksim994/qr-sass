"use client";

import { useCallback } from "react";
import { FileUploadField } from "./file-upload-field";
import { FormField } from "./form-field";

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
      <FormField label="Название трека">
        <input
          className="input"
          value={String(payload.title || "")}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Название"
        />
      </FormField>
      <FormField label="Исполнитель">
        <input
          className="input"
          value={String(payload.artist || "")}
          onChange={(e) => onChange({ ...payload, artist: e.target.value })}
          placeholder="Имя исполнителя"
        />
      </FormField>
      <div>
        <p className="label" id="mp3-file-label">Аудиофайл</p>
        <FileUploadField
          accept="audio/*"
          workspaceId={workspaceId}
          onUploaded={handleUploaded}
          currentFilename={String(payload.filename || "")}
          labelledBy="mp3-file-label"
        />
      </div>
    </div>
  );
}
