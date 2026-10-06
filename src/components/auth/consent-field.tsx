"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  kind?: "terms" | "data";
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function ConsentField({ kind = "data", checked, onChange, disabled = false }: Props) {
  const id = useId();

  return (
    <label className="fk-choice fk-choice--checkbox qrs-auth-consent" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="fk-choice__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        required
      />
      <span className="fk-choice__box" aria-hidden="true">
        <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="fk-choice__text">
        {kind === "terms" ? (
          <>Принимаю <Link href="/terms-of-service" target="_blank" className="qrs-auth-inline-link">оферту и пользовательское соглашение</Link></>
        ) : (
          <>Даю <Link href="/personal-data-consent" target="_blank" className="qrs-auth-inline-link">согласие на обработку персональных данных</Link> для регистрации и работы аккаунта</>
        )}
      </span>
    </label>
  );
}
