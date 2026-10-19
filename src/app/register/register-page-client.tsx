"use client";

import { COMMERCIAL } from "@/lib/commercial-config";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import Link from "next/link";
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
import { MSG } from "@/lib/user-messages";
import { destinationAfterAuth } from "@/lib/qr-draft";

type Props = {
  dynamicIntent?: boolean; staticIntent?: boolean;
  planName: string;
  features: string[];
  nextPath: string;
  yandexEnabled?: boolean;
};

export function RegisterPageClient({ planName, features, nextPath, dynamicIntent, staticIntent, yandexEnabled = false }: Props) {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, consent, termsAccepted, legalVersion: LEGAL_VERSION }),
      });
      const parsed = await parseApiResponse<{ userId?: string }>(response);
      if (!parsed.ok) {
        logger.warn({
          area: "ui",
          route: "/register",
          message: "Register request failed",
          code: parsed.code ?? "REQUEST_ERROR",
          status: parsed.status,
          details: { email },
        });
        setError(parsed.error ?? MSG.COULD_NOT_CREATE_ACCOUNT);
        return;
      }

      // Registration receipt is claimed after navigation, including consent/counter readiness.
      router.push(destinationAfterAuth(nextPath));
      router.refresh();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="register"
      title={dynamicIntent ? "Сохраните динамический код" : staticIntent ? "Сохраните код в архиве" : "Создать аккаунт"}
      subtitle={
        dynamicIntent ? `${COMMERCIAL.free.dynamic} динамических кода бесплатно, Про — ${COMMERCIAL.trialDays} дней без карты. Автосписаний нет` : staticIntent ? "Бесплатно, до 10 кодов, доступ с любого устройства" : nextPath.startsWith("/dashboard/create")
          ? "После регистрации продолжим создание вашего QR-кода."
          : `Начните с тарифа «${planName}». Банковская карта не нужна.`
      }
      planName={planName}
      planFeatures={dynamicIntent ? ["Код сохранится с вашей ссылкой", "Скачаете и напечатаете", "Ссылку можно менять в кабинете"] : features}
      nextPath={nextPath}
    >
      {yandexEnabled && <><AuthDivider />

      <div className="qrs-auth-social">
        <YandexAuthButton mode="register" nextPath={nextPath} />
        <p className="qrs-auth-social-note">
          Данные обрабатываются по <Link href="/privacy-policy">политике конфиденциальности</Link>. Для регистрации через Яндекс подтвердите условия на следующем шаге.
        </p>
      </div></>}

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
            disabled={loading}
            required
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
            disabled={loading}
            required
          />
        </Field>

        <PasswordField
          value={password}
          onChange={setPassword}
          minLength={8}
          placeholder="Придумайте пароль"
          autoComplete="new-password"
          allowGenerate
          disabled={loading}
        />

        <ConsentField kind="terms" checked={termsAccepted} onChange={setTermsAccepted} disabled={loading} />
        <ConsentField checked={consent} onChange={setConsent} disabled={loading} />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={loading}
          className={loading ? "fk-button--loading" : ""}
          aria-busy={loading}
        >
          {loading ? "Создаём аккаунт…" : "Создать аккаунт"}
        </Button>
      </form>


      <AuthSwitchLink mode="register" nextPath={nextPath} />
    </AuthShell>
  );
}
