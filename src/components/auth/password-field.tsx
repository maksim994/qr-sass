"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "./auth-shell.module.css";
import { generatePassword } from "@/lib/generate-password";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  showForgotLink?: boolean;
  autoComplete?: string;
  allowGenerate?: boolean;
  disabled?: boolean;
};

export function PasswordField({
  value,
  onChange,
  placeholder = "Минимум 8 символов",
  minLength,
  required = true,
  showForgotLink = false,
  autoComplete = "current-password",
  allowGenerate = false,
  disabled = false,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [generated, setGenerated] = useState(false);
  const generatedHintId = useId();

  return (
    <Field
      htmlFor={id}
      label={
        showForgotLink ? (
          <span className="qrs-auth-field-label-row">
            <span>Пароль</span>
            <Link href="/forgot-password" className="qrs-auth-forgot">
              Забыли пароль?
            </Link>
          </span>
        ) : (
          "Пароль"
        )
      }
    >
      <div className="fk-input-wrap">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setGenerated(false);
          }}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-describedby={generated ? generatedHintId : undefined}
          withSuffix
        />
        <button
          type="button"
          className="qrs-auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
              <path d="M10.7 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.8M6.2 6.2A18 18 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.1-1.4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {allowGenerate ? (
        <>
          <div className={styles.generate}><span>От 8 символов</span><Button
            type="button"
            variant="text"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onChange(generatePassword());
              setVisible(true);
              setGenerated(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></svg>Сгенерировать пароль
          </Button></div>
          <span id={generatedHintId} className={styles.passwordHint} role="status">
            {generated ? "Пароль сгенерирован. Сохраните его в менеджере паролей." : ""}
          </span>
        </>
      ) : null}
    </Field>
  );
}
