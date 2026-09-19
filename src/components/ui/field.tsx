import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

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
  const autoId = useId();
  const hintId = useId();
  const errorId = useId();
  const invalid = Boolean(error);
  const fieldId = htmlFor ?? autoId;
  const describedBy = [invalid ? errorId : null, hint && !invalid ? hintId : null].filter(Boolean).join(" ") || undefined;

  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const control =
    child && isValidElement(child)
      ? cloneElement(child as ReactElement<Record<string, unknown>>, {
          id: (child.props as { id?: string }).id ?? fieldId,
          "aria-describedby": describedBy ?? (child.props as { "aria-describedby"?: string })["aria-describedby"],
          "aria-invalid": invalid || undefined,
          "aria-required": required || undefined,
        })
      : children;

  const controlId =
    child && isValidElement(child)
      ? String((control as ReactElement<{ id?: string }>).props.id ?? fieldId)
      : fieldId;

  return (
    <div className={`fk-field${invalid ? " fk-field--invalid" : ""} ${className}`.trim()}>
      {label ? (
        <label className="fk-field__label" htmlFor={controlId}>
          {label}
          {required ? <span className="fk-field__req" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {control}
      {hint && !error ? (
        <span id={hintId} className="fk-field__hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="fk-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
