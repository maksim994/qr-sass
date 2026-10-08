"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";
import { parseStaticQrDraft, readStaticDraftSnapshot, subscribeStaticDraft, clearStaticQrDraft } from "@/lib/static-qr-draft";
import { clearQrCreateDraft } from "@/lib/qr-draft";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { contentTypeLabels } from "@/lib/qr-types";
import { trackGoal, PRODUCT_GOALS } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";

export function ResumeStaticDraft({ workspaceId, limitReached }: { workspaceId: string; limitReached: boolean }) {
  const raw = useSyncExternalStore(subscribeStaticDraft, readStaticDraftSnapshot, () => null);
  const draft = parseStaticQrDraft(raw), router = useRouter(), busy = useRef(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  if (!draft) return null;

  async function save() {
    if (busy.current) return;
    const draft = parseStaticQrDraft(readStaticDraftSnapshot());
    if (!draft) { setError(MSG.QR_DRAFT_EXPIRED); return; }
    busy.current = true; setSaving(true); setError("");
    try {
      const response = await fetchApi("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, name: `Статический QR: ${contentTypeLabels[draft.contentType]}`, kind: "STATIC", contentType: draft.contentType, payload: draft.payload, style: draft.style }) });
      const result = await parseApiResponse<{ qrId: string }>(response);
      if (!result.ok || !result.data?.qrId) { setError(result.error ?? MSG.QR_SAVE_FAILED); return; }
      trackGoal(PRODUCT_GOALS.qr_created, { source: "static_archive", kind: "STATIC", contentType: draft.contentType });
      clearStaticQrDraft(); clearQrCreateDraft(); router.push(`/dashboard/qr/${result.data.qrId}`); router.refresh();
    } catch { setError(MSG.AUTH_NETWORK_ERROR); }
    finally { busy.current = false; setSaving(false); }
  }

  return <div className="qrs-create-alerts"><Alert variant="info" title="Статический QR готов к сохранению">
    <p>Тип: {contentTypeLabels[draft.contentType]}. Сохранится отдельная копия с выбранными цветами. Напечатанный QR не меняется и не собирает статистику сканов.</p>
    {limitReached ? <p>Лимит облачного архива достигнут. Уже скачанный QR продолжает работать; бесплатно создавать и скачивать новые можно на главной.</p> : <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Сохранение…" : "Сохранить в архив статических"}</Button>}
    <Button type="button" variant="ghost" disabled={saving} onClick={clearStaticQrDraft}>Убрать черновик</Button>
    {error && <p role="alert">{error}</p>}
  </Alert></div>;
}
