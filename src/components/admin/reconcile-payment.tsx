"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { describeReconciliation } from "@/lib/admin-reconcile-result";
import { MSG } from "@/lib/user-messages";
export function ReconcilePayment({
  providerPaymentId,
}: {
  providerPaymentId: string;
}) {
  const router = useRouter(),
    pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchApi("/api/admin/billing/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerPaymentId }),
      });
      const parsed = await parseApiResponse<{
        checked: number;
        applied: number;
        results: { ok: boolean; reason: string; applied?: boolean }[];
      }>(response);
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.ADMIN_CHANGE_FAILED);
        return;
      }
      const outcome = describeReconciliation(parsed.data?.results?.[0]);
      if (outcome.error) setError(outcome.error);
      if (outcome.notice) setNotice(outcome.notice);
      router.refresh();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="secondary" disabled={busy} onClick={run}>
        {busy ? "Проверка…" : "Сверить с ЮKassa"}
      </Button>
      {error && <Alert variant="danger">{error}</Alert>}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
