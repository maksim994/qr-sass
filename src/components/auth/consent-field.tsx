"use client";

import Link from "next/link";
import { useId } from "react";

export function PersonalDataConsentField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
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
        Я даю{" "}
        <Link href="/personal-data-consent" target="_blank" className="qrs-auth-inline-link">
          согласие на обработку персональных данных
        </Link>
      </span>
    </label>
  );
}

export function TermsConsentField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
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
        Я принимаю{" "}
        <Link href="/terms-of-service" target="_blank" className="qrs-auth-inline-link">
          Пользовательское соглашение
        </Link>{" "}
        и{" "}
        <Link href="/privacy-policy" target="_blank" className="qrs-auth-inline-link">
          Политику конфиденциальности
        </Link>
      </span>
    </label>
  );
}

/** Один чекбокс: ПДн + оферта + политика (регистрация через Яндекс, re-consent). */
export function LegalBundleConsentField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
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
        Я даю{" "}
        <Link href="/personal-data-consent" target="_blank" className="qrs-auth-inline-link">
          согласие на обработку персональных данных
        </Link>
        , принимаю{" "}
        <Link href="/terms-of-service" target="_blank" className="qrs-auth-inline-link">
          Пользовательское соглашение
        </Link>{" "}
        и{" "}
        <Link href="/privacy-policy" target="_blank" className="qrs-auth-inline-link">
          Политику конфиденциальности
        </Link>
      </span>
    </label>
  );
}

export function NewsletterConsentField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label className="fk-choice fk-choice--checkbox qrs-auth-consent" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="fk-choice__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="fk-choice__box" aria-hidden="true">
        <svg className="fk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="fk-choice__text">Хочу получать новости и полезные материалы по эл. почте</span>
    </label>
  );
}

/** @deprecated Use PersonalDataConsentField + TermsConsentField */
export function ConsentField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <PersonalDataConsentField checked={checked} onChange={onChange} />;
}
