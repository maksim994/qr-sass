"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQrContinuePath,
  normalizeDraftUrl,
  writeQrCreateDraft,
  type QrCreateDraft,
} from "@/lib/qr-draft";

type Props = {
  signedIn: boolean;
  tone?: "page" | "on-accent";
  placeholder?: string;
  defaultKind?: "STATIC" | "DYNAMIC";
  hint?: string;
  submitLabel?: string;
  formId?: string;
};

export function CreateUrlStartForm({
  signedIn,
  tone = "page",
  placeholder = "https://cafe.example/menu",
  defaultKind = "DYNAMIC",
  hint = "После регистрации вернёмся к этой ссылке — заполнять заново не нужно.",
  submitLabel = "Создать QR для моей ссылки",
  formId,
}: Props) {
  const router = useRouter();
  const urlId = useId();
  const kindName = useId();
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">(defaultKind);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeDraftUrl(url);
    if (!normalized) {
      setError("Введите обычную ссылку http или https — без локальных адресов.");
      return;
    }
    setError("");
    const draft: QrCreateDraft = { v: 1, contentType: "URL", url: normalized, kind };
    writeQrCreateDraft(draft);
    const continuePath = createQrContinuePath(draft);
    if (signedIn) {
      router.push(continuePath);
      return;
    }
    router.push(`/register?next=${encodeURIComponent(continuePath)}`);
  }

  const onAccent = tone === "on-accent";

  return (
    <form id={formId} onSubmit={submit} className={`qrs-start-form${onAccent ? " qrs-start-form--on-accent" : ""}`}>
      <div className="qrs-start-form__row">
        <label className="fk-field__label" htmlFor={urlId}>
          Ссылка для QR
        </label>
        <div className="qrs-start-form__controls">
          <Input
            id={urlId}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError("");
            }}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${urlId}-error` : `${urlId}-hint`}
            inputSize="lg"
          />
          <Button type="submit" variant={onAccent ? "secondary" : "accent"} size="lg">
            {submitLabel}
          </Button>
        </div>
        <p id={`${urlId}-hint`} className="fk-field__hint">
          {hint}
        </p>
        {error ? (
          <p id={`${urlId}-error`} className="fk-field__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <fieldset className="qrs-start-kind">
        <legend className="qrs-start-kind__legend">Что должно быть в коде</legend>
        <div className="qrs-start-kind__grid">
          <label className={`qrs-start-kind__card${kind === "DYNAMIC" ? " qrs-start-kind__card--active" : ""}`}>
            <input
              type="radio"
              name={kindName}
              value="DYNAMIC"
              checked={kind === "DYNAMIC"}
              onChange={() => setKind("DYNAMIC")}
            />
            <span className="qrs-start-kind__title">Можно менять после печати</span>
            <span className="qrs-start-kind__text">
              В коде — короткая ссылка QR-S. Адрес меню или акции меняете в кабинете, макет тот же.
            </span>
          </label>
          <label className={`qrs-start-kind__card${kind === "STATIC" ? " qrs-start-kind__card--active" : ""}`}>
            <input
              type="radio"
              name={kindName}
              value="STATIC"
              checked={kind === "STATIC"}
              onChange={() => setKind("STATIC")}
            />
            <span className="qrs-start-kind__title">Содержимое навсегда</span>
            <span className="qrs-start-kind__text">
              В коде сразу ваш адрес. Проще, но после печати ссылку уже не сменить.
            </span>
          </label>
        </div>
      </fieldset>
    </form>
  );
}
