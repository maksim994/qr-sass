"use client";

import { useId, useState } from "react";
import { AuthShell, AuthSwitchLink } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fetchApi, parseApiResponse } from "@/lib/client-api";

export function ForgotPasswordClient() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetchApi("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const parsed = await parseApiResponse<{ message?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось отправить запрос. Попробуйте позже.");
      return;
    }
    setDone(true);
  }

  return (
    <AuthShell
      mode="forgot"
      title="Сброс пароля"
      subtitle="Укажите email аккаунта. Если он есть в сервисе, придёт письмо со ссылкой."
    >
      {done ? (
        <Alert variant="success" size="sm">
          Если аккаунт с этим адресом есть, мы отправили письмо со ссылкой. Проверьте входящие и папку «Спам». Ссылка
          действует один час.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="qrs-auth-form">
          {error ? (
            <Alert variant="danger" size="sm" onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}
          <Field label="Email" htmlFor={emailId} required>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" block disabled={loading} aria-busy={loading}>
            Отправить ссылку
          </Button>
        </form>
      )}
      <AuthSwitchLink mode="forgot" />
    </AuthShell>
  );
}
