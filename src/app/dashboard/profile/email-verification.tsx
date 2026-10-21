"use client";
import { useState } from "react";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
export function EmailVerification() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function send() {
    setBusy(true);
    try {
      const response = await fetchApi("/api/user/verify-email", {
        method: "POST",
      });
      const parsed = await parseApiResponse<{ message: string }>(response);
      setMessage(
        parsed.ok
          ? (parsed.data?.message ?? MSG.EMAIL_VERIFICATION_SENT)
          : (parsed.error ?? MSG.EMAIL_VERIFICATION_FAILED),
      );
    } catch {
      setMessage(MSG.EMAIL_VERIFICATION_FAILED);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="qrs-profile-card">
      <p>Email ещё не подтверждён.</p>
      <button
        className="fk-button fk-button--secondary"
        onClick={send}
        disabled={busy}
      >
        {busy ? "Отправка…" : "Отправить письмо для подтверждения"}
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
