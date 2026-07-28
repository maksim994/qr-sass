import type { ReactNode } from "react";

type Props = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className = "",
  children,
}: Props) {
  const invalid = Boolean(error);

  return (
    <div className={`fk-field${invalid ? " fk-field--invalid" : ""} ${className}`.trim()}>
      {label ? (
        <label className="fk-field__label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="fk-field__req" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <span className="fk-field__hint">{hint}</span> : null}
      {error ? <span className="fk-field__error" role="alert">{error}</span> : null}
    </div>
  );
}
