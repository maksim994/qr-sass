"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  AuthDivider,
  AuthShell,
  AuthSwitchLink,
  YandexAuthButton,
} from "@/components/auth/auth-shell";
import { ConsentField } from "@/components/auth/consent-field";
import { PasswordField } from "@/components/auth/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseApiResponse, fetchApi } from "@/lib/client-api";
import { logger } from "@/lib/logger";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

type Props = {
  planName: string;
  features: string[];
};

export function RegisterPageClient({ planName, features }: Props) {
  const router = useRouter();
  const nameId = useId();
  const workspaceId = useId();
  const emailId = useId();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetchApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workspaceName, email, password, consent }),
    });
    const parsed = await parseApiResponse<{ userId?: string }>(response);
    setLoading(false);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/register",
        message: "Register request failed",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
        details: { email },
      });
      setError(parsed.error ?? "Не удалось создать аккаунт.");
      return;
    }

    trackGoal(PRODUCT_GOALS.registration_completed);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      mode="register"
      title="Создать аккаунт"
      subtitle={`Начните с тарифа «${planName}» за пару секунд.`}
      planName={planName}
      planFeatures={features}
    >
      <form onSubmit={onSubmit} className="qrs-auth-form">
        {error ? (
          <Alert variant="danger" size="sm" onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        <Field label="Имя" htmlFor={nameId} required>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Иван Петров"
            autoComplete="name"
            required
          />
        </Field>

        <Field
          label={
            <>
              Рабочее пространство{" "}
              <span className="qrs-auth-optional">(необязательно)</span>
            </>
          }
          htmlFor={workspaceId}
        >
          <Input
            id={workspaceId}
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Моя команда"
            autoComplete="organization"
          />
        </Field>

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
          minLength={8}
          autoComplete="new-password"
        />

        <ConsentField checked={consent} onChange={setConsent} />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          block
          disabled={loading}
          className={loading ? "fk-button--loading" : ""}
          aria-busy={loading}
        >
          Создать аккаунт
        </Button>
      </form>

      <AuthDivider />

      <div className="qrs-auth-social">
        <YandexAuthButton mode="register" />
        <p className="qrs-auth-social-note">
          Продолжая, вы соглашаетесь с обработкой персональных данных и условиями сервиса.
        </p>
      </div>

      <AuthSwitchLink mode="register" />
    </AuthShell>
  );
}
