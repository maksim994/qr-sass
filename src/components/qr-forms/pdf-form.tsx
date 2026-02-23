"use client";

import { useCallback } from "react";
import { FileUploadField } from "./file-upload-field";

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  workspaceId: string;
};

export function PdfForm({ payload, onChange, workspaceId }: Props) {
  const handleUploaded = useCallback(
    (data: { fileUrl: string; fileId: string; filename: string }) => {
      onChange({ ...payload, fileUrl: data.fileUrl, fileId: data.fileId, filename: data.filename });
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
          placeholder="Название документа"
        />
      </div>
      <div>
        <label className="label">PDF-файл</label>
        <FileUploadField
          accept="application/pdf"
          workspaceId={workspaceId}
          onUploaded={handleUploaded}
          currentFilename={String(payload.filename || "")}
        />
      </div>
    </div>
  );
}
