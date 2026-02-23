"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseApiResponse } from "@/lib/client-api";

type Props = {
  qrId: string;
  qrName: string;
};

export default function DeleteQrButton({ qrId, qrName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch(`/api/qr/${qrId}`, { method: "DELETE" });
    const parsed = await parseApiResponse<{ deleted?: boolean }>(response);
    setDeleting(false);

    if (parsed.ok) {
      router.push("/dashboard/library");
      router.refresh();
    } else {
      alert(parsed.error ?? "Не удалось удалить QR-код.");
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        Удалить
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-800">
        Удалить «{qrName}»? QR-код будет скрыт из библиотеки.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-danger btn-sm"
        >
          {deleting ? "Удаление…" : "Да, удалить"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="btn btn-secondary btn-sm"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
