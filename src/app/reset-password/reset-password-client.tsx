"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, AuthSwitchLink } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchApi, parseApiResponse } from "@/lib/client-api";

type Props = {
  token: string;
};

export function ResetPasswordClient({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(token ? "" : "В ссылке нет токена. Запросите сброс пароля заново.");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    const response = await fetchApi("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const parsed = await parseApiResponse<{ userId?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось обновить пароль. Запросите новую ссылку.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell mode="forgot" title="Новый пароль" subtitle="Задайте пароль длиной не меньше восьми символов.">
      <form onSubmit={onSubmit} className="qrs-auth-form">
        {error ? (
          <Alert variant="danger" size="sm" onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
        <Button type="submit" variant="primary" size="lg" block disabled={loading || !token} aria-busy={loading}>
          Сохранить пароль
        </Button>
      </form>
      <AuthSwitchLink mode="forgot" />
    </AuthShell>
  );
}
