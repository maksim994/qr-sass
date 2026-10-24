"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LegalBundleConsentField, NewsletterConsentField } from "@/components/auth/consent-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchApi, parseApiResponse } from "@/lib/client-api";

type Props = {
  title: string;
  subtitle: string;
  submitLabel: string;
  apiPath: "/api/auth/yandex/complete" | "/api/auth/legal-consent";
  cancelHref?: string;
  cancelLabel?: string;
};

export function LegalConsentForm({
  title,
  subtitle,
  submitLabel,
  apiPath,
  cancelHref,
  cancelLabel = "Отмена",
}: Props) {
  const router = useRouter();
  const [bundle, setBundle] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bundle) return;
    setLoading(true);
    setError("");

    const response = await fetchApi(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDataConsent: true,
        termsAccepted: true,
        newsletter,
      }),
    });
    const parsed = await parseApiResponse<{ redirectTo?: string }>(response);
    setLoading(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось сохранить согласие.");
      return;
    }

    router.push(parsed.data?.redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="qrs-auth-form">
      {title ? (
        <div className="qrs-auth__heading" style={{ marginBottom: "20px" }}>
          <h1 className="qrs-auth__title">{title}</h1>
          {subtitle ? <p className="qrs-auth__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
        {error ? (
          <Alert variant="danger" size="sm" onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        <LegalBundleConsentField checked={bundle} onChange={setBundle} />
        <NewsletterConsentField checked={newsletter} onChange={setNewsletter} />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          block
          disabled={loading || !bundle}
          className={loading ? "fk-button--loading" : ""}
          aria-busy={loading}
        >
          {submitLabel}
        </Button>

        {cancelHref ? (
          <Button type="button" variant="secondary" size="lg" block href={cancelHref}>
            {cancelLabel}
          </Button>
        ) : null}
    </form>
  );
}
