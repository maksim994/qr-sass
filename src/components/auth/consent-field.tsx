"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ConsentField({ checked, onChange }: Props) {
  const id = useId();

  return (
    <label className="fk-choice fk-choice--checkbox qrs-auth-consent" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="fk-choice__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required
      />
      <span className="fk-choice__box" aria-hidden="true">
        <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="fk-choice__text">
        Я согласен на{" "}
        <Link href="/privacy-policy" target="_blank" className="qrs-auth-inline-link">
          обработку персональных данных
        </Link>{" "}
        и принимаю условия{" "}
        <Link href="/terms-of-service" target="_blank" className="qrs-auth-inline-link">
          Пользовательского соглашения
        </Link>
      </span>
    </label>
  );
}
