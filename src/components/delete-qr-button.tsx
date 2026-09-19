"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteQrDialog } from "@/components/delete-qr-dialog";

type Props = {
  qrId: string;
  qrName: string;
  kind: "STATIC" | "DYNAMIC";
};

export default function DeleteQrButton({ qrId, qrName, kind }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return <>
    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      Удалить
    </Button>
    {confirming && <DeleteQrDialog
      qrId={qrId}
      qrName={qrName}
      kind={kind}
      onClose={() => setConfirming(false)}
      onDeleted={() => { setConfirming(false); router.push("/dashboard/library"); router.refresh(); }}
    />}
  </>;
}
