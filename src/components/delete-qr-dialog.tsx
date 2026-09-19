"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { qrDeleteConfirm } from "@/lib/qr-lifetime-policy";
import { MSG } from "@/lib/user-messages";

type Props = {
  qrId: string;
  qrName?: string;
  kind: "STATIC" | "DYNAMIC";
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteQrDialog({ qrId, qrName, kind, onClose, onDeleted }: Props) {
  const pending = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => {
    if (!pending.current) onClose();
  }, [onClose]);

  async function handleDelete() {
    if (pending.current) return;
    pending.current = true;
    setDeleting(true);
    setError("");
    try {
      const response = await fetchApi(`/api/qr/${qrId}`, { method: "DELETE" });
      const parsed = await parseApiResponse(response);
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.COULD_NOT_DELETE_QR);
        return;
      }
      onDeleted();
    } catch {
      setError(MSG.COULD_NOT_DELETE_QR);
    } finally {
      pending.current = false;
      setDeleting(false);
    }
  }

  return <Modal open onClose={close} closeDisabled={deleting} title="Удалить QR-код?" footer={<>
    <Button type="button" variant="secondary" disabled={deleting} onClick={close}>Отмена</Button>
    <Button type="button" variant="danger" disabled={deleting} onClick={handleDelete}>
      {deleting ? "Удаление…" : "Удалить"}
    </Button>
  </>}>
    <div className="space-y-4" aria-busy={deleting}>
      {qrName && <p className="font-semibold break-words">«{qrName}»</p>}
      <p className="text-sm text-muted">{qrDeleteConfirm(kind)}</p>
      {error && <Alert variant="danger">{error}</Alert>}
    </div>
  </Modal>;
}
