"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";

export function RenameQr({ qrId, name }: { qrId: string; name: string }) {
  const id = useId(), router = useRouter(), busy = useRef(false);
  const [value, setValue] = useState(name), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  return <details><summary>Переименовать в библиотеке</summary><form onSubmit={async event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setSaving(true); setMessage("");
    try {
      const response = await fetchApi(`/api/qr/${qrId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value.trim() }) });
      const result = await parseApiResponse(response);
      if (!result.ok) { setMessage(result.error ?? MSG.COULD_NOT_UPDATE_QR); return; }
      setMessage("Название сохранено. Содержимое QR не изменилось."); router.refresh();
    } catch { setMessage(MSG.AUTH_NETWORK_ERROR); }
    finally { busy.current = false; setSaving(false); }
  }}><label htmlFor={id}>Название</label><Input id={id} value={value} onChange={event => setValue(event.target.value)} required maxLength={120} disabled={saving} /><Button type="submit" disabled={saving || !value.trim() || value.trim() === name}>{saving ? "Сохранение…" : "Сохранить название"}</Button><p role="status">{message}</p></form></details>;
}
