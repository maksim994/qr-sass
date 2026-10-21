"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
export function VerifyEmailClient({ token }: { token: string }) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetchApi("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
      });
      const parsed = await parseApiResponse<{ message: string }>(response);
      if (parsed.ok) {
        setDone(true);
        window.history.replaceState(null, "", "/verify-email");
      } else setError(parsed.error ?? MSG.EMAIL_VERIFICATION_FAILED);
    } catch {
      setError(MSG.EMAIL_VERIFICATION_FAILED);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      mode="forgot"
      title="Подтверждение email"
      subtitle="Подтвердите адрес для сервисных уведомлений QR-S.ru."
    >
      {done ? (
        <Alert variant="success">{MSG.EMAIL_VERIFIED}</Alert>
      ) : (
        <form onSubmit={verify} className="qrs-auth-form">
          {error && <Alert variant="danger">{error}</Alert>}
          {!/^[a-f0-9]{64}$/.test(token) ? (
            <Alert variant="danger">{MSG.EMAIL_VERIFICATION_INVALID}</Alert>
          ) : (
            <Button type="submit" block disabled={busy} aria-busy={busy}>
              {busy ? "Подтверждение…" : "Подтвердить email"}
            </Button>
          )}
        </form>
      )}
      <Link href="/dashboard/profile">Перейти в профиль</Link>
    </AuthShell>
  );
}
