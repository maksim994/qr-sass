"use client";

import { useId, useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  showForgotLink?: boolean;
  autoComplete?: string;
};

export function PasswordField({
  value,
  onChange,
  placeholder = "Минимум 8 символов",
  minLength,
  required = true,
  showForgotLink = false,
  autoComplete = "current-password",
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <Field
      htmlFor={id}
      label={
        showForgotLink ? (
          <span className="qrs-auth-field-label-row">
            <span>Пароль</span>
            <span className="qrs-auth-forgot" title="Восстановление пароля скоро будет доступно">
              Забыли пароль?
            </span>
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
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
          withSuffix
        />
        <button
          type="button"
          className="qrs-auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58A2 2 0 0 0 12 18a2 2 0 0 0 1.42-.58" />
              <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.2 11.2 0 0 1-2.05 3.17M6.61 6.61A11.2 11.2 0 0 0 3 12.5C4.73 16.89 9 20 14 20a10.9 10.9 0 0 0 4.39-.9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </Field>
  );
}
