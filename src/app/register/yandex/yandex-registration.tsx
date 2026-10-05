"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConsentField } from "@/components/auth/consent-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
export function YandexRegistration({ nextPath }: { nextPath: string }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetchApi("/api/auth/yandex", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsAccepted, consent, legalVersion: LEGAL_VERSION, next: nextPath }) });
      const parsed = await parseApiResponse<{ url: string }>(response);
      if (!parsed.ok || !parsed.data?.url) { setError(parsed.error ?? MSG.YANDEX_AUTH_FAILED); setBusy(false); return; }
      window.location.assign(parsed.data.url);
    } catch { setError(MSG.AUTH_NETWORK_ERROR); setBusy(false); }
  }
  return <AuthShell mode="register" title="Регистрация через Яндекс" subtitle="Получим имя и email из выбранного аккаунта Яндекса. Карта не нужна.">
    <form className="qrs-auth-form" onSubmit={submit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <ConsentField kind="terms" checked={termsAccepted} onChange={setTermsAccepted} disabled={busy} />
      <ConsentField checked={consent} onChange={setConsent} disabled={busy} />
      <p className="qrs-auth-social-note"><Link href="/privacy-policy">Как обрабатываются данные</Link>. Эти подтверждения не подписывают вас на рекламу.</p>
      <Button type="submit" block disabled={busy}>{busy ? "Открываем Яндекс…" : "Продолжить через Яндекс"}</Button>
      <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Регистрация по email</Link>
    </form>
  </AuthShell>;
}
