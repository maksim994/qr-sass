"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  AuthDivider,
  AuthShell,
  AuthSwitchLink,
  YandexAuthButton,
} from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseApiResponse, fetchApi } from "@/lib/client-api";
import { logger } from "@/lib/logger";

type Props = {
  initialError?: string;
};

export function LoginPageClient({ initialError = "" }: Props) {
  const router = useRouter();
  const emailId = useId();
  const rememberId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetchApi("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const parsed = await parseApiResponse<{ userId?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/login",
        message: "Login request failed",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
        details: { email },
      });
      setError(parsed.error ?? "Не удалось войти. Проверьте данные.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      mode="login"
      title="С возвращением"
      subtitle="Войдите, чтобы управлять своими QR-кодами."
    >
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

        <PasswordField
          value={password}
          onChange={setPassword}
          showForgotLink
          autoComplete="current-password"
        />

        <label className="fk-choice fk-choice--checkbox qrs-auth-remember" htmlFor={rememberId}>
          <input
            id={rememberId}
            type="checkbox"
            className="fk-choice__input"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span className="fk-choice__box" aria-hidden="true">
            <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span className="fk-choice__text">Запомнить меня</span>
        </label>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          block
          disabled={loading}
          className={loading ? "fk-button--loading" : ""}
          aria-busy={loading}
        >
          Войти
        </Button>
      </form>

      <AuthDivider />

      <div className="qrs-auth-social">
        <YandexAuthButton mode="login" />
        <p className="qrs-auth-social-note">
          Продолжая, вы соглашаетесь с обработкой персональных данных и условиями сервиса.
        </p>
      </div>

      <AuthSwitchLink mode="login" />
    </AuthShell>
  );
}
